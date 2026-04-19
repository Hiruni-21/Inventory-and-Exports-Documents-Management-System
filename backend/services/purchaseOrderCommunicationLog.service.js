const db = require("../config/db");

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

async function logPurchaseOrderCommunication({
  purchaseOrderId,
  supplierId,
  channel,
  subject,
  fileUrl,
  providerMessageId,
  status,
  userId,
  userName,
}) {
  await q(
    `
      INSERT INTO purchase_order_communications
      (
        purchase_order_id,
        supplier_id,
        channel,
        subject,
        file_url,
        provider_message_id,
        status,
        sent_by_user_id,
        sent_by_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      purchaseOrderId,
      supplierId,
      channel,
      subject,
      fileUrl || null,
      providerMessageId || null,
      status || "sent",
      userId || null,
      userName || null,
    ]
  );

  await q(
    `
      INSERT INTO supplier_messages
      (
        supplier_id,
        message_type,
        subject,
        message_body,
        linked_kind,
        linked_record_id,
        sent_by,
        status,
        channel,
        file_url,
        provider_message_id
      )
      VALUES (?, 'purchase_order', ?, ?, 'order', ?, ?, ?, ?, ?, ?)
    `,
    [
      supplierId,
      subject,
      subject,
      purchaseOrderId,
      userName || "Fresh World ERP",
      status || "sent",
      channel,
      fileUrl || null,
      providerMessageId || null,
    ]
  );
}

module.exports = { logPurchaseOrderCommunication };