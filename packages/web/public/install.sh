#!/usr/bin/env bash
# shout — live terminal streaming for AI agents and developers
# https://shout.run
#
# Install:  curl -fsSL https://shout.run/install.sh | bash

set -euo pipefail

# ─── Colors & helpers ───────────────────────────────────────────────────────

BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
RED='\033[31m'
WHITE='\033[97m'

has() { command -v "$1" &>/dev/null; }

info()    { printf "${CYAN}  →${RESET} %s\n" "$1"; }
success() { printf "${GREEN}  ✓${RESET} %s\n" "$1"; }
warn()    { printf "${YELLOW}  !${RESET} %s\n" "$1"; }
fail()    { printf "${RED}  ✗${RESET} %s\n" "$1"; exit 1; }

# Read from /dev/tty so this works when piped via curl
ask() {
  printf "%b" "$1" >/dev/tty
  read -r REPLY </dev/tty
}

# ─── Banner ─────────────────────────────────────────────────────────────────

clear
printf "\n"
printf "${DIM}  ┌──────────────────────────────────────────┐${RESET}\n"
printf "${DIM}  │${RESET}                                          ${DIM}│${RESET}\n"
printf "${DIM}  │${RESET}   ${BOLD}${WHITE}shout${RESET}${DIM}.run${RESET}                               ${DIM}│${RESET}\n"
printf "${DIM}  │${RESET}   ${DIM}live terminal streaming${RESET}                  ${DIM}│${RESET}\n"
printf "${DIM}  │${RESET}                                          ${DIM}│${RESET}\n"
printf "${DIM}  └──────────────────────────────────────────┘${RESET}\n"
printf "\n"

# ─── Prerequisites ──────────────────────────────────────────────────────────

if ! has node; then
  fail "Node.js is required. Install it from https://nodejs.org"
fi

if ! has npm; then
  fail "npm is required. It usually ships with Node.js."
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js 18+ is required. You have $(node -v)."
fi

success "Node.js $(node -v) detected"

# ─── Setup mode ─────────────────────────────────────────────────────────────

printf "\n"
printf "${BOLD}  How do you want to use shout?${RESET}\n"
printf "\n"
printf "  ${GREEN}1${RESET})  ${BOLD}Recommended${RESET}  ${DIM}— personal + agentic streaming  [installs everything]${RESET}\n"
printf "  ${CYAN}2${RESET})  ${BOLD}Personal${RESET}     ${DIM}— stream your own terminal sessions${RESET}\n"
printf "  ${YELLOW}3${RESET})  ${BOLD}Agentic${RESET}      ${DIM}— AI agents stream via SDK & MCP server${RESET}\n"
printf "\n"

ask "  ${BOLD}Choose [1]:${RESET} "
MODE=${REPLY:-1}

case "$MODE" in
  1) MODE_NAME="recommended" ;;
  2) MODE_NAME="personal" ;;
  3) MODE_NAME="agentic" ;;
  *) fail "Invalid choice. Run the installer again." ;;
esac

# ─── Language selection (for agentic or recommended) ────────────────────────

LANG_CHOICE=""

if [ "$MODE_NAME" = "agentic" ] || [ "$MODE_NAME" = "recommended" ]; then
  printf "\n"
  printf "${BOLD}  What's your primary language?${RESET}\n"
  printf "\n"
  printf "  ${GREEN}1${RESET})  ${BOLD}Node.js${RESET}   ${DIM}— TypeScript SDK + MCP server${RESET}\n"
  printf "  ${CYAN}2${RESET})  ${BOLD}Python${RESET}    ${DIM}— Python SDK + MCP server${RESET}\n"
  printf "  ${YELLOW}3${RESET})  ${BOLD}Both${RESET}      ${DIM}— install everything${RESET}\n"
  printf "\n"

  ask "  ${BOLD}Choose [1]:${RESET} "
  LANG_CHOICE=${REPLY:-1}

  case "$LANG_CHOICE" in
    1) LANG_NAME="node" ;;
    2) LANG_NAME="python" ;;
    3) LANG_NAME="both" ;;
    *) fail "Invalid choice. Run the installer again." ;;
  esac

  # Verify Python is available if selected
  if [ "$LANG_NAME" = "python" ] || [ "$LANG_NAME" = "both" ]; then
    if has python3; then
      PYTHON_CMD="python3"
    elif has python; then
      PYTHON_CMD="python"
    else
      fail "Python 3 is required for Python packages. Install it from https://python.org"
    fi

    PY_VERSION=$($PYTHON_CMD --version 2>&1 | sed 's/Python //' | cut -d. -f1)
    if [ "$PY_VERSION" -lt 3 ]; then
      fail "Python 3.10+ is required. You have $($PYTHON_CMD --version)."
    fi

    if has pip3; then
      PIP_CMD="pip3"
    elif has pip; then
      PIP_CMD="pip"
    else
      fail "pip is required for Python packages."
    fi

    success "Python $($PYTHON_CMD --version 2>&1 | sed 's/Python //') detected"
  fi
fi

# ─── Install ────────────────────────────────────────────────────────────────

printf "\n"
printf "${BOLD}  Installing...${RESET}\n"
printf "\n"

# --- CLI (always) ---
info "Installing shout CLI..."
npm install -g shout-run --loglevel=error 2>&1 | sed 's/^/    /'
success "shout CLI installed  ${DIM}(shout-run)${RESET}"

# --- Node SDK + MCP ---
if [ "$MODE_NAME" = "recommended" ] || [ "$MODE_NAME" = "agentic" ]; then
  if [ "$LANG_NAME" = "node" ] || [ "$LANG_NAME" = "both" ]; then
    info "Installing Node.js MCP server..."
    npm install -g shout-run-mcp --loglevel=error 2>&1 | sed 's/^/    /'
    success "MCP server installed  ${DIM}(shout-run-mcp)${RESET}"
  fi

  # --- Python SDK + MCP ---
  if [ "$LANG_NAME" = "python" ] || [ "$LANG_NAME" = "both" ]; then
    info "Installing Python SDK..."
    $PIP_CMD install shout-run-sdk --quiet 2>&1 | sed 's/^/    /'
    success "Python SDK installed  ${DIM}(shout-run-sdk)${RESET}"

    info "Installing Python MCP server..."
    $PIP_CMD install shout-run-mcp --quiet 2>&1 | sed 's/^/    /'
    success "Python MCP installed  ${DIM}(shout-run-mcp)${RESET}"
  fi
fi

# ─── Post-install ───────────────────────────────────────────────────────────

printf "\n"
printf "${DIM}  ──────────────────────────────────────────${RESET}\n"
printf "\n"
printf "  ${GREEN}${BOLD}All set!${RESET} Here's what to do next:\n"
printf "\n"

STEP=1

# Login (always)
printf "  ${BOLD}${STEP}.${RESET} Log in with GitHub:\n"
printf "\n"
printf "     ${CYAN}shout login${RESET}\n"
printf "\n"
STEP=$((STEP + 1))

# Personal streaming
if [ "$MODE_NAME" = "personal" ] || [ "$MODE_NAME" = "recommended" ]; then
  printf "  ${BOLD}${STEP}.${RESET} Start broadcasting:\n"
  printf "\n"
  printf "     ${CYAN}shout${RESET}\n"
  printf "\n"
  printf "     ${DIM}Share the URL — anyone with the link watches live.${RESET}\n"
  printf "\n"
  STEP=$((STEP + 1))
fi

# Agentic — Node
if [ "$MODE_NAME" = "agentic" ] || [ "$MODE_NAME" = "recommended" ]; then
  if [ "$LANG_NAME" = "node" ] || [ "$LANG_NAME" = "both" ]; then
    printf "  ${BOLD}${STEP}.${RESET} Generate an API key for your agents:\n"
    printf "\n"
    printf "     ${CYAN}shout keys create${RESET}\n"
    printf "\n"
    printf "  ${BOLD}$((STEP + 1)).${RESET} Add the SDK to your project:\n"
    printf "\n"
    printf "     ${CYAN}npm install shout-run-sdk${RESET}\n"
    printf "\n"
    printf "     ${DIM}Then in your code:${RESET}\n"
    printf "\n"
    printf "     ${DIM}import { ShoutSDK } from 'shout-run-sdk';${RESET}\n"
    printf "     ${DIM}const shout = new ShoutSDK({ apiKey: process.env.SHOUT_API_KEY });${RESET}\n"
    printf "     ${DIM}const session = await shout.startSession({ title: 'My agent' });${RESET}\n"
    printf "\n"
    STEP=$((STEP + 2))
  fi

  if [ "$LANG_NAME" = "python" ] || [ "$LANG_NAME" = "both" ]; then
    if [ "$LANG_NAME" = "both" ]; then
      printf "  ${DIM}  — or in Python:${RESET}\n"
      printf "\n"
    else
      printf "  ${BOLD}${STEP}.${RESET} Generate an API key for your agents:\n"
      printf "\n"
      printf "     ${CYAN}shout keys create${RESET}\n"
      printf "\n"
      STEP=$((STEP + 1))
      printf "  ${BOLD}${STEP}.${RESET} Use the SDK in your project:\n"
      printf "\n"
    fi
    printf "     ${DIM}from shout_sdk import ShoutSDK${RESET}\n"
    printf "     ${DIM}shout = ShoutSDK(api_key=os.environ['SHOUT_API_KEY'])${RESET}\n"
    printf "     ${DIM}session = shout.start_session(title='My agent')${RESET}\n"
    printf "\n"
    STEP=$((STEP + 1))
  fi

  printf "     ${DIM}Docs: https://shout.run/about${RESET}\n"
  printf "\n"
fi

printf "${DIM}  ──────────────────────────────────────────${RESET}\n"
printf "\n"
printf "  ${DIM}Open source — MIT License${RESET}\n"
printf "  ${DIM}https://github.com/pavanmadiraju91/shout-run${RESET}\n"
printf "\n"
