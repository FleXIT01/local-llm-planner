#!/usr/bin/env python3
"""
local-llm-planner launcher
Usage:
  python run.py          # install deps + start dev server
  python run.py dev      # start dev server (no install)
  python run.py test     # run unit tests
  python run.py build    # compile TypeScript to dist/
  python run.py install  # npm install only
  python run.py all      # install + test + build + start
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):   print(f"{GREEN}[ok]  {msg}{RESET}")
def info(msg): print(f"{CYAN}[>>]  {msg}{RESET}")
def err(msg):  print(f"{RED}[xx]  {msg}{RESET}", file=sys.stderr)

def header(msg):
    print(f"\n{BOLD}{CYAN}{'=' * 50}{RESET}")
    print(f"{BOLD}{CYAN}    {msg}{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 50}{RESET}\n")


def check_prereqs():
    ok_all = True
    for tool in ("node", "npm"):
        r = subprocess.run(f"{tool} --version", shell=True, capture_output=True, text=True)
        if r.returncode == 0:
            ok(f"{tool} {r.stdout.strip()}")
        else:
            err(f"{tool} not found -- install Node.js 22+ from https://nodejs.org")
            ok_all = False
    return ok_all


def npm(script):
    cmd = f"npm run {script}" if script != "install" else "npm install"
    info(cmd)
    return subprocess.run(cmd, shell=True, cwd=ROOT).returncode


def npm_must(script):
    code = npm(script)
    if code != 0:
        err(f"'{script}' failed (exit {code})")
        sys.exit(code)
    ok(f"{script} done")


def cmd_install():
    header("Installing dependencies")
    npm_must("install")


def cmd_test():
    header("Running unit tests")
    npm_must("test")


def cmd_build():
    header("Building TypeScript")
    npm_must("build")


def free_port(port: int) -> None:
    """Kill whatever process is holding the given port (Windows + POSIX)."""
    if sys.platform == "win32":
        subprocess.run(
            f'powershell -Command "'
            f'$p = Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue;'
            f'if ($p) {{ Stop-Process -Id $p.OwningProcess -Force }}"',
            shell=True, capture_output=True,
        )
    else:  # Linux / macOS
        subprocess.run(f"fuser -k {port}/tcp", shell=True, capture_output=True)


def cmd_dev():
    header("Dev server  ->  http://localhost:3000")
    free_port(3000)
    info("Press Ctrl+C to stop")
    try:
        subprocess.run("npm run dev", shell=True, cwd=ROOT)
    except KeyboardInterrupt:
        print()
        info("Server stopped")


def cmd_all():
    cmd_install()
    cmd_test()
    cmd_build()
    cmd_dev()


def cmd_default():
    if not (ROOT / "node_modules").exists():
        cmd_install()
    else:
        info("node_modules found, skipping install  (use 'install' to force)")
    cmd_dev()


COMMANDS = {
    "dev":     cmd_dev,
    "test":    cmd_test,
    "build":   cmd_build,
    "install": cmd_install,
    "all":     cmd_all,
}


def main():
    # enable ANSI on Windows 10+
    os.system("")

    header("local-llm-planner")

    if not check_prereqs():
        sys.exit(1)

    arg = sys.argv[1].lower() if len(sys.argv) > 1 else ""

    if arg in COMMANDS:
        COMMANDS[arg]()
    elif arg in ("", "start"):
        cmd_default()
    else:
        err(f"Unknown command: '{arg}'")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
