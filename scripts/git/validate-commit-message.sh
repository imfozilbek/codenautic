#!/usr/bin/env bash

set -euo pipefail

readonly ALLOWED_TYPES_REGEX="^(feat|fix|docs|style|refactor|perf|test|chore)$"
readonly HEADER_REGEX="^[a-z]+(\([a-z0-9-]+\))?: .+$"

print_usage() {
    echo "Usage:"
    echo "  $0 --commit-msg-file <path>"
    echo "  $0 --range <from>..<to>"
}

fail_validation() {
    local context="$1"
    local reason="$2"

    echo ""
    echo "  BLOCKED: invalid commit message in ${context}"
    echo "  Reason: ${reason}"
    echo ""
    echo "  Required policy:"
    echo "    - Format: <type>(<scope>): <subject> (scope optional for repo-level changes)"
    echo "    - Allowed types: feat, fix, docs, style, refactor, perf, test, chore"
    echo "    - Header length: at least 80 characters"
    echo "    - Body required: at least 20 words"
    echo "    - Forbidden: Co-Authored-By and AI attribution lines"
    echo ""
    return 1
}

count_words() {
    awk '{count += NF} END {print count + 0}'
}

validate_message_file() {
    local message_file="$1"
    local context="$2"
    local message=""
    local header=""
    local commit_type=""
    local header_length=0
    local body=""
    local body_non_empty=""
    local body_word_count=0

    if [ ! -f "$message_file" ]; then
        fail_validation "$context" "commit message file does not exist: ${message_file}"
    fi

    message="$(sed '/^[[:space:]]*#/d' "$message_file")"
    header="$(printf "%s\n" "$message" | sed -n '1p')"

    if [ -z "$header" ]; then
        fail_validation "$context" "empty commit header"
    fi

    if ! printf "%s\n" "$header" | grep -Eq "$HEADER_REGEX"; then
        fail_validation "$context" "header must match <type>(<scope>): <subject>"
    fi

    commit_type="$(printf "%s\n" "$header" | sed -E 's/^([a-z]+).*/\1/')"
    if ! printf "%s\n" "$commit_type" | grep -Eq "$ALLOWED_TYPES_REGEX"; then
        fail_validation "$context" "type '${commit_type}' is not allowed"
    fi

    if printf "%s\n" "$header" | grep -q "[A-Z]"; then
        fail_validation "$context" "header must be lowercase"
    fi

    header_length=${#header}
    if [ "$header_length" -lt 80 ]; then
        fail_validation "$context" "header is too short (${header_length} chars, expected >= 80)"
    fi

    if printf "%s\n" "$message" | grep -Eiq "(^|[[:space:]])co-authored-by:[[:space:]]"; then
        fail_validation "$context" "Co-Authored-By is forbidden"
    fi

    if printf "%s\n" "$message" | grep -Eiq "ai-assisted|ai assisted|ai-generated|ai generated|generated with (chatgpt|codex|claude)|created by (chatgpt|codex|claude)|written by (chatgpt|codex|claude)"; then
        fail_validation "$context" "AI attribution is forbidden"
    fi

    body="$(printf "%s\n" "$message" | sed '1d')"
    body_non_empty="$(printf "%s\n" "$body" | sed '/^[[:space:]]*$/d')"
    if [ -z "$body_non_empty" ]; then
        fail_validation "$context" "commit body is required"
    fi

    body_word_count="$(printf "%s\n" "$body_non_empty" | count_words)"
    if [ "$body_word_count" -lt 20 ]; then
        fail_validation "$context" "commit body is too short (${body_word_count} words, expected >= 20)"
    fi
}

validate_commit_range() {
    local commit_range="$1"
    local commit_sha=""
    local message_file=""
    local has_commits=0

    while IFS= read -r commit_sha; do
        has_commits=1
        message_file="$(mktemp)"
        git log -1 --format=%B "$commit_sha" > "$message_file"
        if ! validate_message_file "$message_file" "commit ${commit_sha}"; then
            rm -f "$message_file"
            return 1
        fi
        rm -f "$message_file"
    done < <(git rev-list --reverse "$commit_range")

    if [ "$has_commits" -eq 0 ]; then
        fail_validation "range ${commit_range}" "no commits found in range"
    fi
}

main() {
    if [ "$#" -ne 2 ]; then
        print_usage
        exit 1
    fi

    case "$1" in
        --commit-msg-file)
            validate_message_file "$2" "local commit message"
            ;;
        --range)
            validate_commit_range "$2"
            ;;
        *)
            print_usage
            exit 1
            ;;
    esac
}

main "$@"
