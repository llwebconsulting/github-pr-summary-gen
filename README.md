# GitHub PR Summary Generator

A Chrome extension that automatically generates pull request titles and summaries using OpenAI's GPT-3.5 model. This extension helps developers write better PR descriptions by analyzing the changes and generating comprehensive summaries.

## Features

- Automatically generates PR titles and summaries based on changes
- Uses OpenAI's GPT-3.5 model for intelligent summarization
- Secure storage of API keys
- Easy-to-use interface
- Works on GitHub PR creation pages
- Supports branch names with slashes
- Generates markdown-formatted summaries

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Setup

1. Click the extension icon in Chrome
2. Click the "Settings" button
3. Enter your required API keys:
   - GitHub access token
   - OpenAI API key

### Required API Keys

#### GitHub Token
You need a GitHub Personal Access Token with the following permissions:
- `repo` scope (Full control of private repositories)
  - Required for reading repository contents and comparing branches
  - Required for creating pull requests

To create a GitHub token:
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate a new token
3. Select the `repo` scope
4. Copy the generated token

#### OpenAI API Key
You need an OpenAI API key with access to the GPT-3.5 model.

To get an OpenAI API key:
1. Go to [OpenAI's API Keys page](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the generated key

## Usage

1. Navigate to a GitHub PR creation page
2. Click the extension icon
3. Click "Generate PR Summary"
4. The title and description will be automatically filled with AI-generated content

## Security

- All API keys are stored securely in Chrome's sync storage
- Keys are never sent to any servers except their respective APIs
- GitHub token is only used to fetch repository data
- OpenAI key is only used to generate summaries

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the tests (if applicable)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/github-pr-summary.git
   cd github-pr-summary
   ```

2. Make your changes to the source code

3. Test your changes:
   - Load the extension in Chrome
   - Test on a GitHub PR creation page
   - Verify the summary generation works as expected

4. Submit a pull request with a clear description of your changes

### Code Style

- Use consistent indentation (2 spaces)
- Follow JavaScript best practices
- Add comments for complex logic
- Keep functions focused and single-purpose
- Use meaningful variable and function names

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the GPT-3.5 model
- GitHub for their comprehensive API
- All contributors who help improve this extension 