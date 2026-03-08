export function qrScannerModalTemplate() {
  return `
    <section class="modal">
      <div class="card-title-row">
        <h2>QR Student Check-In</h2>
        <button class="btn btn-outline btn-small" data-modal-close type="button">Close</button>
      </div>
      <p class="help-text">Scan student QR code to log attendance and start a lesson session.</p>
      <p class="help-text">If camera permission was denied previously, enable it in browser/app settings and reopen scanner.</p>
      <div id="qrScannerRegion" class="scanner-region"></div>
      <div class="action-row">
        <button class="btn btn-danger btn-small" id="stopScannerBtn" type="button">Stop Scanner</button>
      </div>
    </section>
  `;
}
