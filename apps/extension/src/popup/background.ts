import type { BackgroundRequest, BackgroundResponse } from "../shared/protocol";

export async function sendBackground(message: BackgroundRequest): Promise<BackgroundResponse> {
  return await new Promise<BackgroundResponse>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(response as BackgroundResponse);
    });
  });
}
