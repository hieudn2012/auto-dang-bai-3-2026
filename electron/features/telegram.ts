// Import Telegram Bot API
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN || '';

// Send report to Telegram
export const sendReportToTelegram = async (reportName: string, reportData: any) => {
  const { results, totalCompleted, totalFailed, failedItems } = reportData;

  let message = `<b>📊 Báo cáo: ${reportName}</b>\n\n`;
  message += `<b>📈 Thống kê:</b>\n`;
  message += `• Tổng cộng: ${results.length}\n`;
  message += `• ✅ Hoàn thành: ${totalCompleted}\n`;
  message += `• ❌ Thất bại: ${totalFailed}\n`;
  message += `• 📊 Tỷ lệ thành công: ${results.length > 0 ? Math.round((totalCompleted / results.length) * 100) : 0}%\n\n`;
  
  if (failedItems.length > 0) {
    message += `<b>❌ Các tài khoản thất bại:</b>\n`;
    failedItems.slice(0, 10).forEach((item: any, index: number) => {
      message += `${index + 1}. ID: ${item.id} - ${item.username}\n`;
    });
    
    if (failedItems.length > 10) {
      message += `... và ${failedItems.length - 10} tài khoản khác\n`;
    }
    message += '\n';
  }
  
  message += `<b>🕐 Thời gian:</b> ${new Date().toLocaleString('vi-VN')}`;
  
  // Send message via Telegram
  const bot = new TelegramBot(token);
  await bot.sendMessage(process.env.TELEGRAM_CHAT_ID || '', message, { parse_mode: 'HTML' });
};
