"""
Hierarchical Stem Separation Pipeline
--------------------------------------
Stage 1  →  Demucs htdemucs_6s
             vocals | drums | bass | guitar | piano | other

Stage 2a →  Drum sub-separation (spectral + HPSS)
             kick | snare | hi-hat | cymbals | toms

Stage 2b →  Vocal sub-separation (mid-side + spectral masking)
             lead vocal | backing vocals
"""

import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
import scipy.signal
import scipy.ndimage


class HierarchicalStemSeparator:
    def __init__(self, output_base: str, device: str = "cpu"):
        self.output_base = Path(output_base)
        self.device = device

    # ------------------------------------------------------------------
    # Stage 1: Main stem separation via Demucs
    # ------------------------------------------------------------------

    def separate_main_stems(
        self,
        audio_path: str,
        job_id: str,
        model: str = "htdemucs_6s",
    ) -> dict[str, str]:
        """
        Run Demucs and return {stem_name: file_path}.
        htdemucs_6s outputs: vocals, drums, bass, guitar, piano, other
        """
        out_dir = self.output_base / job_id / "demucs"
        out_dir.mkdir(parents=True, exist_ok=True)

        cmd = [
            "python", "-m", "demucs",
            "--name", model,
            "--device", self.device,
            "--out", str(out_dir),
            "--mp3",
            "--mp3-bitrate", "192",
            str(audio_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Demucs failed:\n{result.stderr}")

        input_stem = Path(audio_path).stem
        stems_dir = out_dir / model / input_stem

        if not stems_dir.exists():
            raise FileNotFoundError(f"Demucs output not found at {stems_dir}")

        stems: dict[str, str] = {}
        for f in stems_dir.glob("*.mp3"):
            stems[f.stem] = str(f)

        # Normalize 'piano' key → 'piano' (some model versions use 'piano')
        return stems

    # ------------------------------------------------------------------
    # Helpers: pure scipy/numpy audio I/O + DSP (no librosa/numba)
    # ------------------------------------------------------------------

    @staticmethod
    def _load_mono(path: str, target_sr: int = 44100):
        """Load audio file as mono float32 numpy array, resampled to target_sr."""
        y, sr = sf.read(path, dtype="float32", always_2d=True)
        # y shape: (samples, channels) — convert to mono
        mono = y.mean(axis=1)
        if sr != target_sr:
            # Simple polyphase resampling via scipy
            from math import gcd
            g = gcd(target_sr, sr)
            mono = scipy.signal.resample_poly(mono, target_sr // g, sr // g)
        return mono.astype(np.float32), target_sr

    @staticmethod
    def _load_stereo(path: str, target_sr: int = 44100):
        """Load audio as stereo (2, samples) float32, resampled to target_sr."""
        y, sr = sf.read(path, dtype="float32", always_2d=True)
        if y.shape[1] == 1:
            y = np.hstack([y, y])
        left, right = y[:, 0], y[:, 1]
        if sr != target_sr:
            from math import gcd
            g = gcd(target_sr, sr)
            up, down = target_sr // g, sr // g
            left  = scipy.signal.resample_poly(left,  up, down).astype(np.float32)
            right = scipy.signal.resample_poly(right, up, down).astype(np.float32)
        return left, right, target_sr

    @staticmethod
    def _stft(y: np.ndarray, n_fft: int = 2048, hop: int = 512):
        """Short-time Fourier transform → complex spectrogram."""
        window = scipy.signal.get_window("hann", n_fft)
        _, _, Z = scipy.signal.stft(y, nperseg=n_fft, noverlap=n_fft - hop, window=window)
        return Z  # shape: (n_fft//2+1, frames)

    @staticmethod
    def _istft(Z: np.ndarray, n_fft: int = 2048, hop: int = 512, length: int = None):
        """Inverse STFT → waveform."""
        window = scipy.signal.get_window("hann", n_fft)
        _, y = scipy.signal.istft(Z, nperseg=n_fft, noverlap=n_fft - hop, window=window)
        if length is not None:
            y = y[:length]
        return y.astype(np.float32)

    @staticmethod
    def _fft_freqs(sr: int, n_fft: int = 2048) -> np.ndarray:
        return np.linspace(0, sr / 2, n_fft // 2 + 1)

    @staticmethod
    def _hpss(mag: np.ndarray, kernel: int = 31) -> tuple:
        """Harmonic-Percussive Source Separation via median filtering."""
        H = scipy.ndimage.median_filter(mag, size=(kernel, 1))
        P = scipy.ndimage.median_filter(mag, size=(1, kernel))
        # Wiener-like soft masks
        H_mask = H ** 2 / (H ** 2 + P ** 2 + 1e-8)
        P_mask = P ** 2 / (H ** 2 + P ** 2 + 1e-8)
        return mag * H_mask, mag * P_mask

    # ------------------------------------------------------------------
    # Stage 2a: Drum sub-separation (spectral)
    # ------------------------------------------------------------------

    def separate_drums(self, drums_path: str, job_id: str) -> dict[str, str]:
        """Decompose drum stem into: kick, snare, hihat, cymbals, toms."""
        out_dir = self.output_base / job_id / "drums"
        out_dir.mkdir(parents=True, exist_ok=True)

        sr = 44100
        n_fft, hop = 2048, 512

        y, sr = self._load_mono(drums_path, sr)
        Z = self._stft(y, n_fft, hop)
        mag = np.abs(Z)
        phase = np.exp(1j * np.angle(Z))
        freqs = self._fft_freqs(sr, n_fft)

        H, P = self._hpss(mag, kernel=31)

        def band(low_hz: float, high_hz: float) -> np.ndarray:
            lo = int(np.searchsorted(freqs, low_hz))
            hi = int(np.searchsorted(freqs, high_hz))
            m = np.zeros_like(mag)
            m[lo:hi, :] = 1.0
            return m

        components: dict[str, np.ndarray] = {
            "kick":    P * band(40, 250),
            "snare":   P * band(120, 6000),
            "toms":    P * band(80, 500),
            "hihat":   P * band(7000, 18000) * 0.7 + H * band(7000, 18000) * 0.3,
            "cymbals": H * band(3500, 20000) * 0.8 + P * band(3500, 20000) * 0.2,
        }

        stems: dict[str, str] = {}
        for name, filtered_mag in components.items():
            audio = self._istft(filtered_mag * phase, n_fft, hop, length=len(y))
            peak = np.abs(audio).max()
            if peak > 0:
                audio = audio / peak * 0.9
            path = out_dir / f"{name}.wav"
            sf.write(str(path), audio, sr)
            stems[name] = str(path)

        return stems

    # ------------------------------------------------------------------
    # Stage 2b: Vocal sub-separation (mid-side + spectral masking)
    # ------------------------------------------------------------------

    def separate_vocals(self, vocals_path: str, job_id: str) -> dict[str, str]:
        """
        Split vocal stem into lead vocal and backing vocals.

        Improved approach:
        - Wiener soft mask on mid/side channels (better than hard cut)
        - Temporal smoothing to reduce musical noise artifacts
        - Backing reconstructed from full L/R stereo (preserves width/panning)
        - Frequency-dependent mask strength (vocal range treated differently)
        """
        out_dir = self.output_base / job_id / "vocals"
        out_dir.mkdir(parents=True, exist_ok=True)

        sr = 44100
        n_fft, hop = 2048, 512

        left, right, sr = self._load_stereo(vocals_path, sr)
        length = min(len(left), len(right))
        left, right = left[:length], right[:length]

        mid  = (left + right) / 2.0
        side = (left - right) / 2.0

        Z_left  = self._stft(left,  n_fft, hop)
        Z_right = self._stft(right, n_fft, hop)
        Z_mid   = self._stft(mid,   n_fft, hop)
        Z_side  = self._stft(side,  n_fft, hop)

        mag_mid  = np.abs(Z_mid)
        mag_side = np.abs(Z_side)
        eps = 1e-8

        freqs = self._fft_freqs(sr, n_fft)

        # ── Step 1: Wiener power mask (centred = lead) ──────────────────
        power_mid  = mag_mid  ** 2
        power_side = mag_side ** 2
        lead_mask = power_mid / (power_mid + power_side + eps)

        # ── Step 2: Temporal + spectral smoothing ────────────────────────
        # Smooth in time (reduce musical noise / flutter)
        lead_mask = scipy.ndimage.uniform_filter1d(lead_mask, size=11, axis=1)
        # Smooth in frequency (reduce metallic ringing artifacts)
        lead_mask = scipy.ndimage.uniform_filter1d(lead_mask, size=3,  axis=0)
        lead_mask = np.clip(lead_mask, 0.0, 1.0)

        # ── Step 3: Frequency-dependent sharpening ───────────────────────
        # Vocal fundamental range → push mask toward 0 or 1 more aggressively
        voc_lo = int(np.searchsorted(freqs, 120))
        voc_hi = int(np.searchsorted(freqs, 5000))
        # Sharpen: raise to power < 1 expands mask, raise to power > 1 contracts
        # We want lead_mask to be bolder in vocal range → push values apart
        segment = lead_mask[voc_lo:voc_hi, :]
        # Soft-clip towards 0/1: x*(1 + 0.5*(1-x)*x) style sharpening
        lead_mask[voc_lo:voc_hi, :] = np.clip(segment * 1.25 - 0.1, 0.0, 1.0)

        # Sub-bass (< 120 Hz): not vocal — don't assign to lead
        lead_mask[:voc_lo, :] *= 0.2

        # ── Step 4: Derive backing mask ──────────────────────────────────
        # Backing = what's NOT lead, but preserve some of mid too (reverb, doubles)
        backing_mask = 1.0 - lead_mask * 0.92   # slight bleed keeps naturalness

        # ── Lead: masked mid channel ─────────────────────────────────────
        lead_spec  = lead_mask * Z_mid
        lead_audio = self._istft(lead_spec, n_fft, hop, length=length)

        # ── Backing: apply complement mask to full L/R, keep stereo ─────
        back_L = self._istft(backing_mask * Z_left,  n_fft, hop, length=length)
        back_R = self._istft(backing_mask * Z_right, n_fft, hop, length=length)

        # Boost backing level (it's quieter by nature)
        back_stereo = np.column_stack([back_L, back_R])
        peak_b = np.abs(back_stereo).max()
        if peak_b > eps:
            back_stereo = back_stereo / peak_b * 0.88

        # Normalise lead
        peak_l = np.abs(lead_audio).max()
        if peak_l > eps:
            lead_audio = lead_audio / peak_l * 0.92

        lead_path = out_dir / "lead_vocal.wav"
        back_path = out_dir / "backing_vocals.wav"
        sf.write(str(lead_path), lead_audio.astype(np.float32), sr)
        sf.write(str(back_path), back_stereo.astype(np.float32), sr)

        return {"lead_vocal": str(lead_path), "backing_vocals": str(back_path)}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def wav_to_mp3(self, wav_path: str, bitrate: str = "192k") -> str:
        """Convert WAV to MP3 for web delivery."""
        mp3_path = wav_path.replace(".wav", ".mp3")
        cmd = [
            "ffmpeg", "-y", "-i", wav_path,
            "-codec:a", "libmp3lame", "-b:a", bitrate,
            mp3_path,
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        return mp3_path
