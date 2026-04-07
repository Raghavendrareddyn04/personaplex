# PersonaPlex — Quick Start Guide

> Complete setup guide for running PersonaPlex locally after cloning this repo.  
> No prior knowledge required — just follow each step in order.

---

## What You Need Before Starting

| Requirement | Minimum |
|-------------|---------|
| Operating System | Ubuntu 20.04+ / Debian 11+ (Linux recommended) |
| GPU | NVIDIA GPU with **16 GB VRAM** (e.g. RTX 3090, A100, V100) |
| CUDA | 12.x |
| Python | 3.10 or 3.11 |
| RAM | 16 GB+ |
| Internet | Required (downloads ~15 GB of model weights on first run) |
| Microphone | Required for live voice conversation |
| Browser | Chrome or Edge (Firefox also works) |

> **No GPU?** Add `--cpu-offload` to every server command below. It works but will be much slower.

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/Raghavendrareddyn04/personaplex.git
cd personaplex
```

---

## Step 2 — Install System Dependency (Opus codec)

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y libopus-dev

# Fedora / RHEL / CentOS
sudo dnf install -y opus-devel
```

---

## Step 3 — Install Python Dependencies

```bash
pip install moshi/.
```

> If you have a **Blackwell GPU** (RTX 5000 series), also run:
> ```bash
> pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu130
> ```

---

## Step 4 — Get a Hugging Face Token

The model weights are hosted on Hugging Face and require a free account.

1. Create a free account at https://huggingface.co/join
2. Accept the model license at https://huggingface.co/nvidia/personaplex-7b-v1
3. Generate an access token at https://huggingface.co/settings/tokens  
   *(Read access is enough)*
4. Export the token in your terminal:

```bash
export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Tip:** Add this line to your `~/.bashrc` or `~/.zshrc` so you don't have to repeat it.

---

## Step 5 — Run the Server

### Option A — HTTP (simplest, same machine only)

```bash
python -m moshi.server
```

### Option B — HTTPS (required when accessing from another device or browser that blocks mic over HTTP)

```bash
SSL_DIR=$(mktemp -d)
python -m moshi.server --ssl "$SSL_DIR"
```

### Option C — Serve the built Web UI alongside the server

```bash
python -m moshi.server --static client/dist
```

> **Low GPU memory?** Add `--cpu-offload` (requires `pip install accelerate`):
> ```bash
> python -m moshi.server --cpu-offload
> ```

When the server is ready you will see:

```
Access the Web UI directly at http://172.x.x.x:8998
```

---

## Step 6 — Open the Web UI

Open the printed URL in **Chrome or Edge**.

> If you used `--ssl`, the URL starts with `https://`. Your browser will show a security warning for the self-signed certificate — click **Advanced → Proceed** to continue.

---

## Step 7 — Start a Conversation

1. **Choose a Text Prompt** — pick a preset (e.g. *888 IVR*, *Assistant*, *Medical office*) or write your own instructions in the text box.
2. **Choose a Voice** — select from Natural (NATURAL_F/M) or Variety (VARIETY_F/M) voices.
3. Click **Connect** — allow microphone access when the browser asks.
4. Wait for the model to greet you (~5–10 seconds on first load while model weights download).
5. **Speak** — the model listens and responds in real time.
6. Click **Disconnect** to end the session.

---

## Available Preset Prompts

| Preset | Description |
|--------|-------------|
| **Assistant (default)** | Friendly teacher — answers questions and gives advice |
| **888 IVR (1-9 menu)** | IVR call assistant — presents a menu and routes by number |
| **Medical office** | Records new patient intake information |
| **Bank** | Handles a flagged transaction for First Neuron Bank |
| **Astronaut (fun)** | Urgent Mars mission reactor-core crisis roleplay |

You can also write a fully custom prompt — up to 1000 characters.

---

## Troubleshooting

### "No audio / model not responding after greeting"
- Make sure you are running the **latest code** from this repo (fixes a WebSocket timeout bug that caused the connection to close during silence).
- Do a **hard refresh** in the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to clear any cached JS.

### "Microphone access denied"
- Browser mic permissions must be granted. Over plain HTTP Chrome blocks mic access — use `--ssl` or access via `localhost` instead of an IP address.

### "CUDA out of memory"
- Add `--cpu-offload` to the server command and install `pip install accelerate`.

### "FileNotFoundError: voices.tgz"
- Make sure `HF_TOKEN` is exported and you have accepted the model license on Hugging Face.

### Server starts but no URL printed
- The default port is **8998**. Try opening `http://localhost:8998` manually.

### Python version error
- Use Python 3.10 or 3.11. Check with `python --version`.

---

## Running with a Custom Voice Prompt Directory

If you have pre-computed voice prompt files (`.pt` files):

```bash
python -m moshi.server --voice-prompt-dir /path/to/your/voices/
```

---

## Offline Evaluation (No Microphone Needed)

Test the model against a WAV file instead of live mic input:

```bash
python -m moshi.offline \
  --voice-prompt "NATF2.pt" \
  --input-wav "assets/test/input_assistant.wav" \
  --seed 42424242 \
  --output-wav "output.wav" \
  --output-text "output.json"
```

---

## Quick Reference — All Server Flags

| Flag | Description |
|------|-------------|
| `--host` | Host to bind (default: `localhost`) |
| `--port` | Port to listen on (default: `8998`) |
| `--static` | Path to built client dist folder |
| `--ssl` | Path to folder with `key.pem` and `cert.pem` |
| `--cpu-offload` | Offload model layers to CPU (saves GPU memory) |
| `--voice-prompt-dir` | Directory with `.pt` voice prompt files |
| `--device` | `cuda` or `cpu` (default: `cuda`) |
| `--moshi-weight` | Path to local Moshi checkpoint (skips HF download) |
| `--mimi-weight` | Path to local Mimi checkpoint (skips HF download) |
| `--tokenizer` | Path to local tokenizer file (skips HF download) |
| `--gradio-tunnel` | Expose server via Gradio tunnel (public URL) |
