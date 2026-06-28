const axios = require('axios');
const jwt = require('jsonwebtoken');

class TryBitPayment {
    constructor(apiKey, shopId, secretKey) {
        this.apiKey = apiKey;
        this.shopId = shopId;
        this.secretKey = secretKey;
        this.baseUrl = 'https://api.trybit.com/v2';
    }

    async createInvoice(amount, orderId, email, cryptocurrency = null) {
        try {
            const requestBody = {
                amount: parseFloat(amount),
                shop_id: this.shopId,
                currency: 'USD',
                order_id: orderId.toString(),
                email: email,
                add_fields: {
                    time_to_pay: { hours: 24, minutes: 0 },
                    available_currencies: [
                        'USDT_TRC20', 'USDT_BSC', 'USDT_ERC20',
                        'USDC_BSC', 'USDC_ERC20',
                        'BTC', 'ETH', 'LTC', 'TRX', 'BNB', 'TON', 'SOL'
                    ]
                }
            };

            if (cryptocurrency) {
                requestBody.add_fields.cryptocurrency = cryptocurrency;
            }

            const response = await axios.post(
                `${this.baseUrl}/invoice/create`,
                requestBody,
                {
                    headers: {
                        'Authorization': `Token ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.status === 'success') {
                return response.data.result;
            } else {
                throw new Error(response.data.result?.message || 'Failed to create invoice');
            }
        } catch (error) {
            console.error('TryBit API Error:', error.response?.data || error.message);
            throw new Error('Failed to create invoice: ' + (error.response?.data?.result?.message || error.message));
        }
    }

    async getInvoiceInfo(invoiceUuid) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/invoice/merchant/info`,
                { uuids: [invoiceUuid] },
                {
                    headers: {
                        'Authorization': `Token ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.status === 'success' && response.data.result.length > 0) {
                return response.data.result[0];
            } else {
                throw new Error('Invoice not found');
            }
        } catch (error) {
            console.error('TryBit API Error:', error.response?.data || error.message);
            throw new Error('Failed to get invoice info: ' + error.message);
        }
    }

    verifyWebhookToken(token) {
        try {
            const decoded = jwt.verify(token, this.secretKey, { algorithms: ['HS256'] });
            return true;
        } catch (error) {
            console.error('JWT verification failed:', error.message);
            return false;
        }
    }
}

module.exports = TryBitPayment;