# Frequently Asked Questions

## General Questions

### Q: What Python versions are supported?

A: AgentNeo supports Python 3.8 and above.

### Q: Can I use AgentNeo with any LLM provider?

A: Yes, AgentNeo supports various providers including OpenAI, Anthropic, and others through LiteLLM.

### Q: How do I update AgentNeo?

A: Use pip to update to the latest version:

```bash
pip install --upgrade agentneo
```

## Privacy & Security

### Q: Is my data safe with AgentNeo? What about privacy?

A: Yes, your data is completely safe. AgentNeo operates entirely on your local system and does not transmit any data externally. All data, including traces and logs, are stored locally on your machine. We do not collect any telemetry data or usage statistics - your privacy is our priority.

The only external communications are the API calls you explicitly configure to your chosen LLM provider (like OpenAI or Anthropic). These calls are made using your own API keys and follow the privacy policies of those providers.

### Q: Where is my data stored?

A: All data is stored locally on your system:

- Trace data: `{agentneo-package-path}/ui/dist/trace_data.db`
- Logs: In your system's standard logging directory
- Configuration: In your project directory

You have complete control over this data and can delete it at any time.

// ... existing questions ...

## Privacy & Security

### Q: Is my data safe with AgentNeo? What about privacy?

A: Yes, your data is completely safe. AgentNeo operates entirely on your local system and does not transmit any data externally. All data, including traces and logs, are stored locally on your machine. We do not collect any telemetry data or usage statistics - your privacy is our priority.

The only external communications are the API calls you explicitly configure to your chosen LLM provider (like OpenAI or Anthropic). These calls are made using your own API keys and follow the privacy policies of those providers.

### Q: Where is my data stored?

A: All data is stored locally on your system:

- Trace data: `{agentneo-package-path}/ui/dist/trace_data.db`
- Logs: In your system's standard logging directory
- Configuration: In your project directory

You have complete control over this data and can delete it at any time.

## Theme Questions

### Q: How do I change the theme of the dashboard?

A: Use the **Theme Toggle Button** in the top-right corner of the dashboard. You can switch between the following options:

- **Light**: A bright and clear interface.
- **Dark**: A dark, eye-friendly theme.
- **System**: Automatically matches your system's default theme (light or dark mode).

### Q: Will my theme preference be saved?

A: Yes, your selected theme is stored locally, and the dashboard will remember your choice for future sessions.

### Q: Can I switch themes while using the dashboard?

A: Absolutely! You can toggle between themes at any time without refreshing the page.

### Q: What happens if I don't select a theme?

A: If no theme is selected, the dashboard defaults to the **light** theme.

## Integration Questions

### Q: Can I use AgentNeo with other Agentic Framworks?

A: Yes, see the [Developer Guide](../developer-guide/advanced-usage.md) for more information.

## Customization Questions

### Q: How do I open the dashboard on a different port?

A: You can specify a custom port when launching the dashboard:

```python
neo_session.launch_dashboard(port=8080)
```
