// ============================================
// CRYPTO PAYMENTS (NOWPayments)
// ============================================

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_BASE_URL = 'https://api.nowpayments.io/v1';

// Функция для создания платежа в NOWPayments
async function createNowPaymentsPayment(amount, orderId, email, currency = 'USDTTRC20') {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://ariawave-uplayonlin.amvera.io';
        
        const paymentData = {
            price_amount: amount,
            price_currency: 'usd',
            pay_currency: currency,
            order_id: orderId.toString(),
            order_description: `Order #${orderId} - Ariawave Beats Store`,
            ipn_callback_url: `${frontendUrl}/api/nowpayments-webhook`,
            success_url: `${frontendUrl}/payment-success.html`,
            cancel_url: `${frontendUrl}/crypto-payment.html`,
            is_fixed_rate: false,
            is_fee_paid_by_user: true
        };

        console.log('📤 Sending to NOWPayments:', paymentData);

        const response = await fetch(`${NOWPAYMENTS_BASE_URL}/payment`, {
            method: 'POST',
            headers: {
                'x-api-key': NOWPAYMENTS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();
        console.log('📥 NOWPayments response:', result);

        if (response.ok && result.payment_id) {
            return {
                success: true,
                paymentId: result.payment_id,
                paymentStatus: result.payment_status,
                payAddress: result.pay_address,
                payAmount: result.pay_amount,
                payCurrency: result.pay_currency,
                invoiceUrl: result.invoice_url,
                purchaseId: result.purchase_id,
                amount: result.price_amount,
                currency: result.price_currency
            };
        } else {
            throw new Error(result.message || 'Failed to create payment');
        }
    } catch (error) {
        console.error('NOWPayments API Error:', error);
        throw new Error('Failed to create payment: ' + error.message);
    }
}

// Функция для проверки статуса платежа
async function getNowPaymentsPaymentStatus(paymentId) {
    try {
        const response = await fetch(`${NOWPAYMENTS_BASE_URL}/payment/${paymentId}`, {
            method: 'GET',
            headers: {
                'x-api-key': NOWPAYMENTS_API_KEY
            }
        });

        const result = await response.json();

        if (response.ok) {
            return {
                paymentId: result.payment_id,
                status: result.payment_status,
                payAddress: result.pay_address,
                payAmount: result.pay_amount,
                payCurrency: result.pay_currency,
                actuallyPaid: result.actually_paid,
                createdAt: result.created_at,
                updatedAt: result.updated_at
            };
        } else {
            throw new Error(result.message || 'Failed to get payment status');
        }
    } catch (error) {
        console.error('NOWPayments Status Error:', error);
        throw new Error('Failed to get payment status: ' + error.message);
    }
}

// Создать крипто-платёж
app.post('/api/crypto/create', async (req, res) => {
    console.log('🔔 Crypto create request received');
    console.log('📦 Request body:', req.body);

    const { orderId, amount, email, cryptocurrency } = req.body;

    console.log('🔍 Parsed values:');
    console.log('  - orderId:', orderId);
    console.log('  - amount:', amount);
    console.log('  - email:', email);
    console.log('  - cryptocurrency:', cryptocurrency);

    if (!orderId || !amount || !email) {
        console.error('❌ Missing required fields!');
        return res.status(400).json({
            error: 'Order ID, amount and email are required',
            received: { orderId, amount, email }
        });
    }

    if (!NOWPAYMENTS_API_KEY) {
        console.error('❌ NOWPayments API key not set!');
        return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    try {
        // Маппинг криптовалют для NOWPayments
        const currencyMap = {
            'USDT_TRC20': 'USDTTRC20',
            'USDT_BSC': 'USDTBSC',
            'USDT_ERC20': 'USDT',
            'USDC_ERC20': 'USDC',
            'BTC': 'BTC',
            'ETH': 'ETH',
            'LTC': 'LTC',
            'TRX': 'TRX',
            'BNB': 'BNB',
            'TON': 'TON',
            'SOL': 'SOL'
        };

        const nowCurrency = currencyMap[cryptocurrency] || 'USDTTRC20';
        console.log('💱 Currency mapping:', cryptocurrency, '→', nowCurrency);

        // Создаём платёж в NOWPayments
        const payment = await createNowPaymentsPayment(
            parseFloat(amount),
            orderId,
            email,
            nowCurrency
        );

        console.log('✅ Payment created:', payment);

        // Сохраняем в БД
        const sql = `INSERT INTO crypto_payments 
                     (order_id, invoice_uuid, invoice_status, amount_usd, 
                      pay_currency, pay_address, payment_link, status, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`;

        db.run(sql, [
            orderId,
            payment.paymentId.toString(),
            payment.paymentStatus,
            amount,
            payment.payCurrency,
            payment.payAddress,
            payment.invoiceUrl,
            new Date().toISOString()
        ], function (err) {
            if (err) {
                console.error('❌ DB Error:', err.message);
                return res.status(500).json({ error: err.message });
            }

            // Обновляем заказ
            db.run('UPDATE orders SET payment_id = ?, payment_method = ? WHERE id = ?',
                [payment.paymentId.toString(), 'crypto', orderId]);

            res.json({
                success: true,
                invoiceUuid: payment.paymentId.toString(),
                invoiceStatus: payment.paymentStatus,
                amount: payment.payAmount,
                amountUsd: amount,
                currency: payment.payCurrency,
                address: payment.payAddress,
                paymentLink: payment.invoiceUrl,
                expiryDate: new Date(Date.now() + 86400000).toISOString(),
                qrCode: payment.payAddress ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${payment.payAddress}` : null
            });
        });
    } catch (error) {
        console.error('❌ Crypto payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook от NOWPayments
app.post('/api/nowpayments-webhook', express.json({ type: 'application/json' }), (req, res) => {
    console.log('🔔 NOWPayments webhook received!');
    console.log('📦 Webhook body:', JSON.stringify(req.body, null, 2));

    const {
        payment_id,
        payment_status,
        order_id,
        pay_amount,
        pay_currency,
        price_amount,
        price_currency,
        purchase_id
    } = req.body;

    console.log(`📊 Payment #${payment_id}, Order #${order_id}, Status: ${payment_status}`);

    // Определяем новый статус
    let newStatus = 'pending';
    if (payment_status === 'confirmed' || payment_status === 'finished') {
        newStatus = 'paid';
    } else if (payment_status === 'failed' || payment_status === 'expired') {
        newStatus = 'failed';
    } else if (payment_status === 'partially_paid') {
        newStatus = 'partial';
    }

    // Обновляем крипто-платёж
    const sql = `UPDATE crypto_payments 
                 SET invoice_status = ?, 
                     amount_crypto = ?,
                     pay_currency = ?,
                     status = ?,
                     paid_at = CASE 
                         WHEN ? = 'paid' THEN ?
                         ELSE paid_at
                     END
                 WHERE invoice_uuid = ?`;

    db.run(sql, [
        payment_status,
        pay_amount || 0,
        pay_currency,
        newStatus,
        newStatus,
        newStatus === 'paid' ? new Date().toISOString() : null,
        payment_id.toString()
    ], function (err) {
        if (err) {
            console.error('❌ Error updating crypto payment:', err);
            return res.status(500).json({ error: err.message });
        }

        console.log(`✅ Updated crypto payment #${payment_id} to status: ${newStatus}`);

        // Если платёж успешен — обновляем заказ
        if (newStatus === 'paid') {
            db.run(`UPDATE orders 
                    SET status = 'paid', 
                        crypto_amount = ?, 
                        crypto_currency = ?, 
                        paid_at = ? 
                    WHERE id = ?`,
                [pay_amount, pay_currency, new Date().toISOString(), order_id],
                (err) => {
                    if (err) {
                        console.error('❌ Error updating order:', err);
                    } else {
                        console.log(`✅ Order #${order_id} paid with crypto!`);
                    }
                }
            );
        }
    });

    // NOWPayments ожидает ответ 200
    res.status(200).json({ success: true });
});

// Проверка статуса платежа (polling с фронта)
app.get('/api/crypto/status/:paymentId', async (req, res) => {
    try {
        const payment = await getNowPaymentsPaymentStatus(req.params.paymentId);

        res.json({
            invoiceUuid: payment.paymentId.toString(),
            status: payment.status,
            invoiceStatus: payment.status,
            amount: payment.payAmount,
            amountUsd: payment.actuallyPaid,
            currency: payment.payCurrency,
            address: payment.payAddress,
            paidAt: payment.updatedAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});