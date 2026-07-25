/** Parse JSON API responses and surface server error messages. */
export async function apiFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    const err = new Error(
      "Cannot reach the server. Ensure the user API (port 5000) and ml-services (port 5001) are running."
    );
    err.status = 0;
    throw err;
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
