document.addEventListener('DOMContentLoaded', async () => {
  const githubTokenInput = document.getElementById('githubToken');
  const openaiKeyInput = document.getElementById('openaiKey');
  const saveBtn = document.getElementById('saveBtn');
  const backBtn = document.getElementById('backBtn');
  const status = document.getElementById('status');

  // Load existing settings
  const settings = await chrome.storage.sync.get(['githubToken', 'openaiKey']);
  if (settings.githubToken) githubTokenInput.value = settings.githubToken;
  if (settings.openaiKey) openaiKeyInput.value = settings.openaiKey;

  saveBtn.addEventListener('click', async () => {
    try {
      const githubToken = githubTokenInput.value.trim();
      const openaiKey = openaiKeyInput.value.trim();

      if (!githubToken || !openaiKey) {
        throw new Error('Please fill in all fields');
      }

      await chrome.storage.sync.set({
        githubToken,
        openaiKey
      });

      status.textContent = 'Settings saved successfully!';
      status.classList.remove('error');
      status.classList.add('success');
    } catch (error) {
      status.textContent = 'Error saving settings: ' + error.message;
      status.classList.remove('success');
      status.classList.add('error');
    }
  });

  backBtn.addEventListener('click', () => {
    window.close();
  });
}); 