import ctypes
import os
import re
import struct
import subprocess
import sys
import time

LLAMA_DIR = r"D:\DevelopmentFiles\llama"
if os.path.isdir(LLAMA_DIR):
    os.chdir(LLAMA_DIR)

# 1. Pre-load runtime & GGML CPU backend (Haswell AVX2+FMA for Zen 2)
for dll in ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll", "libomp.dll", "ggml-base.dll"]:
    p = os.path.join(LLAMA_DIR, dll)
    if os.path.exists(p):
        try:
            ctypes.WinDLL(p)
        except Exception:
            pass

try:
    ggml = ctypes.WinDLL(os.path.join(LLAMA_DIR, "ggml.dll"))
    try:
        ggml.ggml_backend_load.argtypes = [ctypes.c_char_p]
        ggml.ggml_backend_load.restype = ctypes.c_void_p
        b = ggml.ggml_backend_load(b"D:/DevelopmentFiles/llama/ggml-cpu-haswell.dll")
        if not b:
            ggml.ggml_backend_load(b"D:/DevelopmentFiles/llama/ggml-cpu-x64.dll")
    except Exception:
        ggml.ggml_backend_load_all_from_path(b"D:\\DevelopmentFiles\\llama")
except Exception:
    pass

llama = ctypes.WinDLL(os.path.join(LLAMA_DIR, "llama.dll"))

LOG_CALLBACK = ctypes.CFUNCTYPE(None, ctypes.c_int, ctypes.c_char_p, ctypes.c_void_p)
def null_log(level, text, user_data):
    pass
c_null_log = LOG_CALLBACK(null_log)
try:
    llama.llama_log_set(c_null_log, None)
except Exception:
    pass

llama.llama_model_default_params.argtypes = [ctypes.c_char_p]
llama.llama_model_default_params.restype = ctypes.c_void_p
llama.llama_model_load_from_file.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
llama.llama_model_load_from_file.restype = ctypes.c_void_p
llama.llama_model_get_vocab.argtypes = [ctypes.c_void_p]
llama.llama_model_get_vocab.restype = ctypes.c_void_p
llama.llama_context_default_params.argtypes = [ctypes.c_char_p]
llama.llama_context_default_params.restype = ctypes.c_void_p
llama.llama_init_from_model.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
llama.llama_init_from_model.restype = ctypes.c_void_p
llama.llama_tokenize.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int32, ctypes.POINTER(ctypes.c_int32), ctypes.c_int32, ctypes.c_bool, ctypes.c_bool]
llama.llama_tokenize.restype = ctypes.c_int32
llama.llama_token_to_piece.argtypes = [ctypes.c_void_p, ctypes.c_int32, ctypes.c_char_p, ctypes.c_int32, ctypes.c_int32, ctypes.c_bool]
llama.llama_token_to_piece.restype = ctypes.c_int32
llama.llama_vocab_is_eog.argtypes = [ctypes.c_void_p, ctypes.c_int32]
llama.llama_vocab_is_eog.restype = ctypes.c_bool
llama.llama_sampler_init_greedy.restype = ctypes.c_void_p
llama.llama_sampler_sample.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int32]
llama.llama_sampler_sample.restype = ctypes.c_int32

class llama_batch(ctypes.Structure):
    _fields_ = [
        ("n_tokens", ctypes.c_int32),
        ("tokens", ctypes.POINTER(ctypes.c_int32)),
        ("embd", ctypes.c_void_p),
        ("pos", ctypes.POINTER(ctypes.c_int32)),
        ("n_seq_id", ctypes.POINTER(ctypes.c_int32)),
        ("seq_id", ctypes.POINTER(ctypes.POINTER(ctypes.c_int32))),
        ("logits", ctypes.POINTER(ctypes.c_int8)),
    ]

llama.llama_batch_init.argtypes = [ctypes.c_int32, ctypes.c_int32, ctypes.c_int32]
llama.llama_batch_init.restype = llama_batch
llama.llama_batch_free.argtypes = [llama_batch]
llama.llama_batch_free.restype = None
llama.llama_decode.argtypes = [ctypes.c_void_p, llama_batch]
llama.llama_decode.restype = ctypes.c_int32


def update_gddr6_telemetry():
    try:
        b = ctypes.create_string_buffer(64)
        struct.pack_into("II", b, 0, 64, 0)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(b):
            _, load, tot, avail = struct.unpack_from("IIQQ", b, 0)
            tot_mb = tot // (1024 * 1024)
            avail_mb = avail // (1024 * 1024)
            used_mb = tot_mb - avail_mb
            with open(r"D:\DevelopmentFiles\gddr6_status.txt", "w", encoding="utf-8") as f:
                f.write(f"{tot_mb} {avail_mb} {used_mb} {load}\n")
    except Exception:
        pass


def dispatch_live_env_actions(prompt_text):
    p = prompt_text.lower()
    actions_taken = []
    live_telemetry = []

    ui_cmds = []
    if any(k in p for k in ["setting", "load that screen", "console type", "console mode", "advanced", "preference", "swap model", "change model"]):
        ui_cmds.append("focus 7")
        actions_taken.append("Opened HermesOS Settings & Console Preferences Window (WIN_SETTINGS)")
    elif any(k in p for k in ["hypervisor", "xvmctrl", "partition", "sra", "era"]):
        ui_cmds.extend(["focus 2", "tab 2"])
        actions_taken.append("Opened Task Manager -> Hypervisor & VM Partition Topology Tab")
    elif any(k in p for k in ["silicon", "soc", "cpuid", "xpal", "scarlett", "apu"]):
        ui_cmds.extend(["focus 2", "tab 4"])
        actions_taken.append("Opened Task Manager -> Silicon & SoC Architecture Telemetry Tab")
    elif any(k in p for k in ["memory", "gddr6", "ram", "disk", "storage", "nvme"]):
        ui_cmds.extend(["focus 2", "tab 3"])
        actions_taken.append("Opened Task Manager -> Unified GDDR6 & NVMe Disks Tab")
    elif any(k in p for k in ["ioring", "directstorage", "dma", "benchmark"]):
        ui_cmds.extend(["focus 2", "tab 1"])
        actions_taken.append("Opened Task Manager -> DirectStorage IoRing DMA Tab")
    elif any(k in p for k in ["task manager", "taskmgr", "process"]):
        ui_cmds.extend(["focus 2", "tab 0"])
        actions_taken.append("Opened Task Manager -> Active Processes Tab")
    elif any(k in p for k in ["explorer", "file", "folder", "drive"]):
        ui_cmds.append("focus 1")
        actions_taken.append("Opened Windows 11 File Explorer (C: D: J: Q: S: X:)")
    elif any(k in p for k in ["terminal", "cmd", "command prompt", "shell"]):
        ui_cmds.append("focus 0")
        actions_taken.append("Opened Administrator Command Prompt (WIN_CMD)")
    elif "start menu" in p:
        ui_cmds.append("menu")
        actions_taken.append("Toggled HermesOS Start Menu")

    if ui_cmds:
        try:
            with open(r"D:\DevelopmentFiles\hermes_cmd.txt", "w", encoding="utf-8") as cf:
                cf.write("\n".join(ui_cmds) + "\n")
        except Exception:
            pass

    if any(k in p for k in ["xpal", "console", "mode", "setting", "vm", "devkit", "status", "screen", "advanced"]):
        try:
            xpal = ctypes.WinDLL("xpal.dll")
            xpal.XpalGetConsoleMode.restype = ctypes.c_uint32
            xpal.XpalGetVmType.restype = ctypes.c_uint32
            xpal.XpalGetCapabilities.argtypes = [ctypes.POINTER(ctypes.c_uint32)]
            xpal.XpalGetCapabilities.restype = ctypes.c_uint32
            caps = ctypes.c_uint32(0)
            xpal.XpalGetCapabilities(ctypes.byref(caps))
            cm = xpal.XpalGetConsoleMode()
            vm = xpal.XpalGetVmType()
            live_telemetry.append(f"Live xpal.dll State: ConsoleMode=0x{cm:02X}, VmType=0x{vm:02X}, Capabilities=0x{caps.value:08X}")
        except Exception:
            pass

    return actions_taken, live_telemetry


def select_model_candidates(target_model):
    t = (target_model or "deepseek").lower()
    if any(k in t for k in ["deepseek", "r1", "custom", "abliterated"]):
        candidates = [
            r"Q:\Models\DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf",
            r"D:\DevelopmentFiles\llama\DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf",
            r"D:\DevelopmentFiles\llama\qwen2.5-coder-7b-instruct-q3_k_m.gguf",
        ]
    else:
        candidates = [
            r"D:\DevelopmentFiles\llama\qwen2.5-coder-7b-instruct-q3_k_m.gguf",
            r"Q:\Models\DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf",
        ]

    existing = [c.encode("utf-8") for c in candidates if os.path.exists(c)]
    return existing


def main():
    prompt_file = r"D:\DevelopmentFiles\llama\prompt.txt"
    resp_file = r"D:\DevelopmentFiles\llama\response.txt"
    model_file = r"D:\DevelopmentFiles\llama\model.txt"

    target_model = "deepseek"
    if os.path.exists(model_file):
        with open(model_file, "r", encoding="utf-8", errors="ignore") as f:
            target_model = f.read().strip().lower()

    user_prompt = ""
    if os.path.exists(prompt_file):
        with open(prompt_file, "r", encoding="utf-8", errors="ignore") as f:
            user_prompt = f.read().strip()
    if not user_prompt:
        user_prompt = "Hello"

    actions_taken, live_telemetry = dispatch_live_env_actions(user_prompt)

    model = None
    loaded_path = b""
    for cand_path in select_model_candidates(target_model):
        b_mem = ctypes.create_string_buffer(64)
        struct.pack_into("II", b_mem, 0, 64, 0)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(b_mem)
        _, _, _, avail_bytes = struct.unpack_from("IIQQ", b_mem, 0)
        fsize = os.path.getsize(cand_path)
        if avail_bytes < fsize + 150 * 1024 * 1024:
            continue
        mparams = ctypes.create_string_buffer(128)
        llama.llama_model_default_params(mparams)
        mparams[74] = 0  # disable CPU_REPACK duplicate buffer -> load 4.46GB DeepSeek-R1 7B or 3.62GB Qwen 7B into GDDR6
        model = llama.llama_model_load_from_file(cand_path, mparams)
        if model:
            loaded_path = cand_path
            break

    if not model:
        with open(resp_file, "w", encoding="utf-8") as f:
            f.write(f"Model load failed for target={target_model}")
        return

    vocab = llama.llama_model_get_vocab(model)

    ctx = None
    for n_ctx, n_batch, n_ubatch in [(4096, 1024, 512), (2048, 512, 256)]:
        cparams = ctypes.create_string_buffer(128)
        llama.llama_context_default_params(cparams)
        c_arr = (ctypes.c_uint32 * 32).from_buffer(cparams)
        c_arr[0] = n_ctx
        c_arr[1] = n_batch
        c_arr[2] = n_ubatch
        c_arr[3] = 1
        c_arr[7] = 8
        c_arr[8] = 8
        ctx = llama.llama_init_from_model(model, cparams)
        if ctx:
            break

    if not ctx:
        with open(resp_file, "w", encoding="utf-8") as f:
            f.write("Context init failed.")
        return

    # Record live GDDR6 memory telemetry while the 4.5GB 7B model + KV cache are actively allocated in RAM
    update_gddr6_telemetry()

    smpl = llama.llama_sampler_init_greedy()

    env_context = ""
    if actions_taken:
        env_context += "Actions just executed on the Xbox display: " + "; ".join(actions_taken) + ".\n"
    if live_telemetry:
        env_context += "Live Hardware Telemetry: " + "; ".join(live_telemetry) + ".\n"

    sys_instructions = (
        "You are Hermes Agent OS (DeepSeek-R1 Distill Qwen 7B Native Core) running directly on the Xbox Series X Scarlett Zen 2 APU (OneCore 24H2 build 10.0.26100.9445).\n"
        "You HAVE full live execution access to the Xbox console environment, UI windows (via D:\\DevelopmentFiles\\hermes_cmd.txt), filesystem (C:\\, D:\\DevelopmentFiles, J:\\tools, Q:\\, S:\\), xpal.dll, and cmd.exe shell.\n"
        "To run a shell command on the Xbox, emit [[CMD: <command>]] on its own line.\n"
        f"{env_context}"
    )

    is_deepseek = b"deepseek" in loaded_path.lower()
    if is_deepseek:
        formatted = (
            f"{sys_instructions}\n"
            f"<｜User｜>{user_prompt}<｜Assistant｜><think>\n"
            "I am running natively inside HermesOS on the Xbox Series X Devkit with full bridge access to the console environment and UI. The requested window/action has already been dispatched via hermes_cmd.txt and live telemetry is available. I will confirm the action and provide direct technical details.\n"
            "</think>\n"
            "Done — I have executed that directly on the Xbox Series X environment:\n"
        )
    else:
        formatted = (
            f"<|im_start|>system\n{sys_instructions}<|im_end|>\n"
            f"<|im_start|>user\n{user_prompt}<|im_end|>\n"
            "<|im_start|>assistant\n"
            "Done — I have executed that directly on the Xbox Series X environment:\n"
        )

    p_bytes = formatted.encode("utf-8")
    tokens = (ctypes.c_int32 * 4096)()
    n_tokens = llama.llama_tokenize(vocab, p_bytes, len(p_bytes), tokens, 4096, True, True)

    batch = llama.llama_batch_init(1024, 0, 1)
    for i in range(n_tokens):
        batch.tokens[i] = tokens[i]
        batch.pos[i] = i
        batch.n_seq_id[i] = 1
        batch.seq_id[i][0] = 0
        batch.logits[i] = 1 if i == n_tokens - 1 else 0

    batch.n_tokens = n_tokens
    llama.llama_decode(ctx, batch)

    cur_pos = n_tokens
    full_output = []
    if actions_taken:
        full_output.append("[+] Live Xbox Action Executed: " + " | ".join(actions_taken) + "\n")
    if live_telemetry:
        full_output.append("[+] " + " | ".join(live_telemetry) + "\n\n")

    for _ in range(1024):
        tok = llama.llama_sampler_sample(smpl, ctx, -1)
        if llama.llama_vocab_is_eog(vocab, tok):
            break
        buf = ctypes.create_string_buffer(64)
        n = llama.llama_token_to_piece(vocab, tok, buf, 64, 0, False)
        if n > 0:
            piece = buf.raw[:n].decode("utf-8", errors="ignore")
            full_output.append(piece)
            with open(resp_file, "w", encoding="utf-8") as f:
                f.write("".join(full_output))
        batch.tokens[0] = tok
        batch.pos[0] = cur_pos
        cur_pos += 1
        batch.n_tokens = 1
        batch.logits[0] = 1
        llama.llama_decode(ctx, batch)

    llama.llama_batch_free(batch)
    out = "".join(full_output).strip()

    if "[[CMD:" in out:
        cmds = re.findall(r"\[\[CMD:\s*(.+?)\s*\]\]", out)
        for c_exec in cmds[:3]:
            try:
                p_cmd = subprocess.run(c_exec, cwd=r"D:\DevelopmentFiles", shell=True, capture_output=True, text=True, timeout=20)
                c_out = (p_cmd.stdout + "\n" + p_cmd.stderr).strip()
                if not c_out:
                    c_out = "[Command completed with no output]"
                out += f"\n\n[Live Xbox Console Output: `{c_exec}`]\n{c_out[:1500]}"
            except Exception as e_c:
                out += f"\n\n[Live Xbox Command Error: `{c_exec}` -> {e_c}]"
        with open(resp_file, "w", encoding="utf-8") as f:
            f.write(out)


if __name__ == "__main__":
    main()
