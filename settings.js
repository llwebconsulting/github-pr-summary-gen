document.addEventListener('DOMContentLoaded', async () => {
  const githubTokenInput = document.getElementById('githubToken');
  const saveBtn = document.getElementById('saveBtn');
  const backBtn = document.getElementById('backBtn');
  const status = document.getElementById('status');

  // Load existing settings
  const settings = await chrome.storage.sync.get(['githubToken']);
  if (settings.githubToken) githubTokenInput.value = settings.githubToken;

  saveBtn.addEventListener('click', async () => {
    try {
      const githubToken = githubTokenInput.value.trim();

      if (!githubToken) {
        throw new Error('Please fill in all fields');
      }

      await chrome.storage.sync.set({
        githubToken
      });

      status.textContent = 'Settings saved successfully!';
      status.classList.remove('error');
      status.classList.add('success');
    } catch (error) {
      status.textContent = `Error saving settings: ${error.message}`;
      status.classList.remove('success');
      status.classList.add('error');
    }
  });

  backBtn.addEventListener('click', () => {
    window.close();
  });
});