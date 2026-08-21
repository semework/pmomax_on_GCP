package main

import (
	"fmt"
	"os"
	"syscall"
)

func required(name string) string {
	value := os.Getenv(name)
	if value == "" {
		fmt.Fprintf(os.Stderr, "%s environment variable must be set\n", name)
		os.Exit(1)
	}
	return value
}

func main() {
	configPath := required("AGENT_CONFIG_FILE")
	config, err := os.ReadFile(configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read agent config: %v\n", err)
		os.Exit(1)
	}

	expandedPath := "/tmp/ubbagent-envsubst.yaml"
	if err := os.WriteFile(expandedPath, []byte(os.ExpandEnv(string(config))), 0o600); err != nil {
		fmt.Fprintf(os.Stderr, "write expanded agent config: %v\n", err)
		os.Exit(1)
	}

	state := "--no-state"
	if dir := os.Getenv("AGENT_STATE_DIR"); dir != "" {
		state = "--state-dir=" + dir
	}
	http := "--no-http"
	if port := os.Getenv("AGENT_LOCAL_PORT"); port != "" {
		http = "--local-port=" + port
	}

	binary := "/usr/local/bin/ubbagent"
	args := []string{binary, "--config", expandedPath, state, http, "--logtostderr", "--v=2"}
	if err := syscall.Exec(binary, args, os.Environ()); err != nil {
		fmt.Fprintf(os.Stderr, "start ubbagent: %v\n", err)
		os.Exit(1)
	}
}
