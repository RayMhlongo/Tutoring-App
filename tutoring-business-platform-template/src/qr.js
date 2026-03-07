export async function generateQr(canvas,value){
  if(!window.QRCode?.toCanvas) throw new Error('QR library unavailable');
  await window.QRCode.toCanvas(canvas,value,{width:220,margin:2});
}
