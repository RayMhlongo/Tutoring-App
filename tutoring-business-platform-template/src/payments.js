import { putRecord, listTable } from './storage.js';

export async function addPayment(payment){
  const id=payment.id||`pay-${Date.now()}`;
  return putRecord('payments',{id,...payment});
}

export async function getPayments(){return listTable('payments');}
