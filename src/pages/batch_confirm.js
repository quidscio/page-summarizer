const params = new URLSearchParams(window.location.search);
const token = params.get('token') || '';
const count = Number.parseInt(params.get('count') || '0', 10);
const scope = params.get('scope') === 'selected' ? 'selected tabs' : 'all tabs';

const message = document.getElementById('message');
message.textContent = `You are about to open ${count} Open+Summarize tabs for ${scope}. Continue?`;

document.getElementById('continue').addEventListener('click', async () => {
  if (!token) {
    window.close();
    return;
  }

  await chrome.runtime.sendMessage({
    action: 'RUN_OPEN_SUMMARIZE_BATCH',
    token,
  });
  window.close();
});

document.getElementById('cancel').addEventListener('click', () => {
  if (token) {
    chrome.runtime.sendMessage({
      action: 'CANCEL_OPEN_SUMMARIZE_BATCH',
      token,
    });
  }
  window.close();
});
