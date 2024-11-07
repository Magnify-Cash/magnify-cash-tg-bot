import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import TelegramBot, {
  CallbackQuery,
  Message,
  Update,
} from 'node-telegram-bot-api';
import { TelegramConfig } from 'src/shared/configs/telegram.config';
import { exit } from 'process';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { GCM } from 'src/shared/utils/gcm.util';
import { EncryptionConfig } from 'src/shared/configs/encryption.config';
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';
import { bytesToHex, Hex } from 'viem';
import { CoinbaseService } from 'src/coinbase/coinbase.service';
import { Prisma } from '@prisma/client';
import { LendingDeskConfig } from 'src/shared/configs/lending-desk.config';
import { Decimal } from '@prisma/client/runtime/library';
import { nowUTCDate } from 'src/shared/utils/now-utc-date.util';
import { addDays, differenceInDays } from 'date-fns';
import { utc } from '@date-fns/utc';
import { calculateLoanInterest } from 'src/shared/utils/calculate-loan-interest.util';
import { fromWei } from 'src/shared/utils/from-wei.util';
import { toWei } from 'src/shared/utils/to-wei.utils';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly bot: TelegramBot;

  constructor(
    private readonly telegramConfig: TelegramConfig,
    private readonly usersService: UsersService,
    private readonly prismaService: PrismaService,
    private readonly encryptionConfig: EncryptionConfig,
    private readonly coinbaseService: CoinbaseService,
    private readonly lendingDeskConfig: LendingDeskConfig,
  ) {
    const { botToken } = this.telegramConfig;

    this.bot = new TelegramBot(botToken, {
      polling: false,
    });
  }

  async onModuleInit(): Promise<void> {
    const { botDomain } = this.telegramConfig;

    await this.setWebHook(`${botDomain}/api/telegram-bot/processUpdate`);

    this.bot.onText(/\/start/, (msg: Message) => this.handleStart(msg));
    this.bot.onText(/\/verify/, (msg: Message) => this.handleVerify(msg));
    this.bot.onText(/\/getloan/, (msg: Message) => this.handleGetLoan(msg));
    this.bot.onText(/\/wallet/, (msg: Message) => this.handleWallet(msg));
    this.bot.onText(/\/help/, (msg: Message) => this.handleHelp(msg));

    this.bot.on('callback_query', async (ctx: CallbackQuery) => {
      const { data, message: msg } = ctx;

      try {
        if (data.startsWith('hideCredentials')) {
          await this.handleHideCredentials(msg);
        } else if (data.startsWith('verify')) {
          await Promise.all([
            this.bot.deleteMessage(msg.chat.id, msg.message_id),
            this.handleVerify(msg),
          ]);
        } else if (data.startsWith('help')) {
          await this.handleHelp(msg);
        } else if (data.startsWith('handleWallet')) {
          await Promise.all([
            this.bot.deleteMessage(msg.chat.id, msg.message_id),
            this.handleWallet(msg),
          ]);
        } else if (data.startsWith('cancelVerification')) {
          await this.handleCancelVerification(msg);
        } else if (data.startsWith('getLoan')) {
          await Promise.all([
            this.bot.deleteMessage(msg.chat.id, msg.message_id),
            this.handleGetLoan(msg),
          ]);
        } else if (data.startsWith('comingSoon')) {
        } else if (data.startsWith('viewActiveLoan')) {
          await Promise.all([
            this.bot.deleteMessage(msg.chat.id, msg.message_id),
            this.handleViewActiveLoan(msg),
          ]);
        } else if (data.startsWith('repayLoan')) {
          await this.handleRepayLoan(msg);
        } else if (data.startsWith('selectLoanAmount')) {
          const parts = data.split(';');

          await Promise.all([
            this.bot.deleteMessage(msg.chat.id, msg.message_id),
            this.handleSelectLoanAmount(msg, parts[1], parts[2]),
          ]);
        } else if (data.startsWith('selectLoanDuration')) {
          const parts = data.split(';');

          await this.handleSelectLoanDuration(msg, parts[1], parts[2]);
        }
      } catch (error) {
        this.logger.error(error);
      }
    });
  }

  async handleSelectLoanDuration(
    msg: Message,
    duration: string,
    amount: string,
  ) {
    const { erc20ContractDecimals, lendingDeskId } = this.lendingDeskConfig;
    const { secret } = this.encryptionConfig;

    const { chat } = msg;

    const user = (await this.usersService.getById(chat.id, {
      wallet: true,
      verification: true,
    })) as Prisma.UserGetPayload<{
      include: {
        wallet: true;
        verification: true;
      };
    }>;

    const gcm = new GCM(secret);
    const decryptedPrivateKey = gcm.decrypt(user.wallet.privateKey);

    const account = await this.coinbaseService.toCoinbaseSmartAccount(
      decryptedPrivateKey as Hex,
    );

    const {
      minAmount,
      maxAmount,
      minInterest,
      maxInterest,
      minDuration,
      maxDuration,
    } = await this.coinbaseService.getLoanConfig(lendingDeskId);

    const amountInput = fromWei(BigInt(amount), erc20ContractDecimals);

    const params = {
      lendingDeskId,
      nftId: user.verification.collateralNftId,
      duration: Math.round(Number(duration) * 24),
      amount: toWei(amount, erc20ContractDecimals),
      maxInterestAllowed: Math.round(
        calculateLoanInterest(
          {
            minAmount,
            maxAmount,
            minInterest,
            maxInterest,
            minDuration,
            maxDuration,
          },
          amountInput,
          duration,
          erc20ContractDecimals,
        ) * 100,
      ),
    };

    this.logger.debug(
      `Processing [initializeNewLoan] User: ${account.address}. Data: ${JSON.stringify(params, null, 2)}...`,
    );

    const { txHash, loanData } = await this.coinbaseService.initializeNewLoan(
      account,
      params,
    );

    this.logger.debug(
      `Completed [initializeNewLoan] User: ${account.address}. Data: ${JSON.stringify(params, null, 2)}. TxHash: ${txHash}. Loan Data: ${JSON.stringify(loanData, null, 2)}`,
    );

    await this.prismaService.loan.create({
      data: {
        loanId: loanData.loanId,
        lendingDeskId: loanData.lendingDeskId,
        borrower: loanData.borrower,
        nftCollection: loanData.nftCollection,
        nftId: loanData.nftId,
        amount: new Decimal(loanData.amount.toString()),
        duration: loanData.duration,
        interest: loanData.interest,
        platformFee: new Decimal(loanData.platformFee.toString()),
        initializeTxHash: txHash,
        userId: chat.id,
      },
    });

    await Promise.all([
      this.bot.sendMessage(
        chat.id,
        `
✅ Successfully initialized loan

Transaction: ${txHash}
        `,
      ),
      this.handleWallet(msg),
    ]);
  }

  async handleSelectLoanAmount(msg: Message, amount: string, apr: string) {
    const { chat } = msg;

    await this.bot.sendMessage(
      chat.id,
      `
📝 Select Loan Duration

Amount: ${amount}
APR: ${apr}%

Choose your preferred duration:
    `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '7 Days',
                callback_data: `selectLoanDuration;7;${amount};${apr}`,
              },
              {
                text: '14 Days',
                callback_data: `selectLoanDuration;14;${amount};${apr}`,
              },
            ],
            [
              {
                text: '30 Days',
                callback_data: `selectLoanDuration;30;${amount};${apr}`,
              },
              {
                text: '45 Days',
                callback_data: `selectLoanDuration;45;${amount};${apr}`,
              },
            ],
            [
              {
                text: '60 Days',
                callback_data: `selectLoanDuration;60;${amount};${apr}`,
              },
            ],
            [{ text: '❌ Cancel', callback_data: 'getLoan' }],
            [{ text: '❓ Help', callback_data: 'help' }],
          ],
        },
      },
    );
  }

  async handleRepayLoan(msg: Message) {
    const { chat } = msg;

    const loan = (await this.usersService.getFirstActiveLoanByUserId(chat.id, {
      user: {
        include: {
          wallet: true,
        },
      },
    })) as Prisma.LoanGetPayload<{
      include: {
        user: {
          include: {
            wallet: true;
          };
        };
      };
    }>;

    const { wallet } = loan.user;

    const { secret } = this.encryptionConfig;

    const gcm = new GCM(secret);
    const decryptedPrivateKey = gcm.decrypt(wallet.privateKey);

    const account = await this.coinbaseService.toCoinbaseSmartAccount(
      decryptedPrivateKey as Hex,
    );

    const { txHash } = await this.coinbaseService.makeLoanPayment(account, {
      loanId: loan.loanId,
      amount: 0n,
      resolve: true,
    });

    await this.prismaService.loan.update({
      where: {
        loanId: loan.loanId,
      },
      data: {
        repayTxHash: txHash,
        status: 'RESOLVED',
      },
    });

    await Promise.all([
      this.bot.sendMessage(
        chat.id,
        `
✅ Successfully repaid loan

Transaction: ${txHash}
        `,
      ),
      this.handleWallet(msg),
    ]);
  }

  async handleStart(msg: Message) {
    const { secret } = this.encryptionConfig;

    const { chat } = msg;

    if (await this.usersService.getById(chat.id)) {
      await this.handleWalletIsReadyToUse(msg);

      return;
    }

    const mnemonic = generateMnemonic(english);
    const account = mnemonicToAccount(mnemonic);
    const privateKey = bytesToHex(account.getHdKey().privateKey);
    const coinbaseSmartWallet =
      await this.coinbaseService.toCoinbaseSmartAccount(privateKey);

    const gcm = new GCM(secret);

    const encryptedMnemonic = gcm.encrypt(mnemonic);
    const encryptedPrivateKey = gcm.encrypt(privateKey);

    await this.usersService.create(
      chat.id,
      account.address,
      coinbaseSmartWallet.address,
      encryptedMnemonic,
      encryptedPrivateKey,
    );

    const msgWait = await this.bot.sendMessage(
      chat.id,
      '⚙️ Initializing Coinbase Smart Wallet...',
    );

    setTimeout(async () => {
      await this.bot.editMessageText(
        '🔐 Generating secure wallet credentials...',
        {
          chat_id: msgWait.chat.id,
          message_id: msgWait.message_id,
        },
      );

      setTimeout(async () => {
        await this.bot.deleteMessage(msgWait.chat.id, msgWait.message_id);

        await this.bot.sendMessage(
          chat.id,
          `
✅ Your Coinbase Smart Wallet is ready!

Address (EOA): ${account.address}
Address (Coinbase Smart Wallet): ${coinbaseSmartWallet.address}
Private Key: ${privateKey}
Recovery Phrase: ${mnemonic}

⚠️ IMPORTANT: Save these credentials securely!
• Write down the recovery phrase on paper
• Never share your private key
• Delete this message after saving

💡 You can manage your wallet using the Coinbase Wallet app or web interface.
        `,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📱 Open Coinbase Wallet',
                    url: `https://wallet.coinbase.com/?address=0xec9b8ED76BA8691796410768C332D0452676984b`,
                  },
                ],
                [
                  {
                    text: `✅ I've Saved My Credentials`,
                    callback_data: 'hideCredentials',
                  },
                ],
                [
                  {
                    text: '❓ Help',
                    callback_data: 'help',
                  },
                ],
              ],
            },
          },
        );
      }, 2000);
    }, 2000);
  }

  async handleHideCredentials(msg: Message) {
    const msgWait = await this.bot.sendMessage(
      msg.chat.id,
      `
⚠️ SECURITY ALERT ⚠️

Your credentials will self-destruct in:

3...
      `,
    );

    setTimeout(async () => {
      await this.bot.editMessageText(
        `
⚠️ SECURITY ALERT ⚠️

Your credentials will self-destruct in:

2...
        `,
        {
          chat_id: msgWait.chat.id,
          message_id: msgWait.message_id,
        },
      );

      setTimeout(async () => {
        await this.bot.editMessageText(
          `
⚠️ SECURITY ALERT ⚠️

Your credentials will self-destruct in:

1...
          `,
          {
            chat_id: msgWait.chat.id,
            message_id: msgWait.message_id,
          },
        );

        setTimeout(async () => {
          await Promise.all([
            this.bot.deleteMessage(msgWait.chat.id, msgWait.message_id),
            this.bot.deleteMessage(msg.chat.id, msg.message_id),
            this.handleWalletIsReadyToUse(msg),
          ]);
        }, 1000);
      }, 1000);
    }, 1000);
  }

  async handleCancelVerification(msg: Message) {
    await this.bot.deleteMessage(msg.chat.id, msg.message_id);
    await this.handleWalletIsReadyToUse(msg);
  }

  async handleViewActiveLoan(msg: Message) {
    const { chat } = msg;

    const { erc20ContractDecimals } = this.lendingDeskConfig;

    const loan = await this.usersService.getFirstActiveLoanByUserId(chat.id);

    if (!loan) {
      await this.bot.deleteMessage(msg.chat.id, msg.message_id);

      return await this.handleGetLoan(msg);
    }

    const formattedAmount = loan.amount
      .div(10 ** erc20ContractDecimals)
      .toFixed(4);

    const dueDate = addDays(loan.createdAt, Number(loan.duration) / 24, {
      in: utc,
    });

    if (nowUTCDate().getTime() - loan.createdAt.getTime() <= 60 * 60 * 1000) {
      await this.bot.sendMessage(
        chat.id,
        `
📊 Active Loan Details

Amount: ${formattedAmount}
Due Date: ${dueDate.toDateString()} 
Days Left: ${differenceInDays(dueDate, nowUTCDate())}
Total Due: ${formattedAmount}

💫 Repay is not available yet! Try again later
      `,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💼 Back to Wallet', callback_data: 'handleWallet' }],
            ],
          },
        },
      );

      return;
    }

    const loanInfo = await this.coinbaseService.loanInfo(loan.loanId);

    if (loanInfo.status) {
      await this.bot.deleteMessage(msg.chat.id, msg.message_id);

      return await this.handleGetLoan(msg);
    }

    const totalDue = new Decimal(
      (await this.coinbaseService.getLoanAmountDue(loan.loanId)).toString(),
    )
      .div(10 ** erc20ContractDecimals)
      .toFixed(4);

    const amount = new Decimal(loanInfo.amount.toString())
      .div(10 ** erc20ContractDecimals)
      .toFixed(4);

    await this.bot.sendMessage(
      chat.id,
      `
📊 Active Loan Details

Amount: ${amount}
Due Date: ${dueDate.toDateString()}
Days Left: ${differenceInDays(dueDate, nowUTCDate())}
Total Due: ${totalDue}

💫 Repay your loan to receive 1.5% back in $MAG Tokens!
    `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💰 Repay Loan',
                callback_data: 'repayLoan',
              },
            ],
            [{ text: '🔔 Set Reminders', callback_data: 'setReminders' }],
            [{ text: '💼 Back to Wallet', callback_data: 'handleWallet' }],
          ],
        },
      },
    );
  }

  async handleGetLoan(msg: Message) {
    const { chat } = msg;

    const user = await this.usersService.getById(chat.id);

    if (!user.verificationNullifierHash) {
      await this.handleWalletIsReadyToUse(msg);

      return;
    }

    const loan = await this.usersService.getFirstActiveLoanByUserId(chat.id);

    if (!loan) {
      await this.bot.sendMessage(
        chat.id,
        `
💰 Available Loan Options

Choose your loan amount:

💫 Earn 1.5% back in $MAG Tokens when you repay your loan!
      `,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '$5 (15.0% APR)',
                  callback_data: 'selectLoanAmount;5;15',
                },
              ],
              [
                {
                  text: '$10 (12.5% APR)',
                  callback_data: 'selectLoanAmount;10;12.5',
                },
              ],
              [
                {
                  text: '$15 (10.0% APR)',
                  callback_data: 'selectLoanAmount;15;10',
                },
              ],
              [{ text: '❌ Cancel', callback_data: 'handleWallet' }],
              [{ text: '❓ Help', callback_data: 'help' }],
            ],
          },
        },
      );
    } else {
      const loanInfo = await this.coinbaseService.loanInfo(loan.loanId);

      if (!loanInfo.status) {
        await this.bot.sendMessage(
          chat.id,
          `
⚠️ You already have an active loan!

Please repay your current loan before applying for a new one.
        `,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📊 View Active Loan',
                    callback_data: 'viewActiveLoan',
                  },
                ],
                [
                  {
                    text: '💼 Back to Wallet',
                    callback_data: 'handleWallet',
                  },
                ],
              ],
            },
          },
        );
      } else {
        await this.prismaService.loan.update({
          where: {
            loanId: loan.loanId,
          },
          data: {
            status: loanInfo.status === 1 ? 'DEFAULTED' : 'RESOLVED',
          },
        });

        return await this.handleGetLoan(msg);
      }
    }
  }

  async handleWalletIsReadyToUse(msg: Message) {
    await this.bot.sendMessage(
      msg.chat.id,
      `
✅ Great! Your wallet is ready to use.

Next step: Complete identity verification to access lending services.
    `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '✅ Complete Verification',
                callback_data: 'verify',
              },
            ],
            [{ text: '💼 View Wallet', callback_data: 'handleWallet' }],
            [{ text: '❓ Help', callback_data: 'help' }],
          ],
        },
      },
    );
  }

  async handleVerify(msg: Message) {
    const { chat } = msg;
    const { botDomain } = this.telegramConfig;

    const user = await this.usersService.getById(chat.id);

    if (!user?.verificationNullifierHash) {
      await this.bot.sendMessage(
        chat.id,
        `
🔐Identity Verification

Please, choose a verification method:

1️⃣ World ID - Verify with biometric proof
2️⃣ Coinbase KYC - Coming soon!
3️⃣ Civic - Coming soon!
      `,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🌏 Verify with World ID',
                  web_app: { url: `${botDomain}/api/world-id/verify` },
                },
              ],
              [
                {
                  text: '🔄 Coinbase KYC (Coming Soon)',
                  callback_data: 'comingSoon',
                },
              ],
              [{ text: '🆔 Civic (Coming soon)', callback_data: 'comingSoon' }],
              [{ text: '❌ Cancel', callback_data: 'cancelVerification' }],
            ],
          },
        },
      );
    } else {
      await this.bot.sendMessage(
        msg.chat.id,
        `
✅ Verification successful!
🎉 Your Identity SBT has been minted.

You now have access to lending services.

What would you like to do next?
            `,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 Get a Loan', callback_data: 'getLoan' }],
              [{ text: '💼 View Wallet', callback_data: 'handleWallet' }],
              [{ text: '❓ Help', callback_data: 'help' }],
            ],
          },
        },
      );
    }
  }

  async handleVerifyProof(chatId: number, success: boolean) {
    if (success) {
      await this.bot.sendMessage(
        chatId,
        `
✅ Verification successful!
🎉 Your Identity SBT has been minted.

You now have access to lending services.

What would you like to do next?
      `,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 Get a Loan', callback_data: 'getLoan' }],
              [{ text: '💼 View Wallet', callback_data: 'handleWallet' }],
              [{ text: '❓ Help', callback_data: 'help' }],
            ],
          },
        },
      );
    } else {
      const msg = await this.bot.sendMessage(
        chatId,
        `
⚠️ Verification failed! 
        
Something went wrong. Please try again or contact support`,
      );
      await this.handleVerify(msg);
    }
  }

  async handleWallet(msg: Message) {
    const { chat } = msg;

    const user = (await this.usersService.getById(chat.id, {
      wallet: true,
    })) as Prisma.UserGetPayload<{
      include: {
        wallet: true;
      };
    }>;

    const status = user.verificationNullifierHash
      ? '✅ Verified'
      : '❌ Not Verified';

    const { erc20ContractDecimals } = this.lendingDeskConfig;

    const balance = new Decimal(
      (
        await this.coinbaseService.getBalance(
          user.wallet.coinbaseSmartWalletAddress,
        )
      ).toString(),
    )
      .div(10 ** erc20ContractDecimals)
      .toFixed(4);

    await this.bot.sendMessage(
      chat.id,
      `
💼 Your Wallet

Address: ${user.wallet.coinbaseSmartWalletAddress}
Balance: ${balance}

Status: ${status}

What would you like to do?
    `,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Get a Loan', callback_data: 'getLoan' }],
            [
              {
                text: '✅ Complete Verification',
                callback_data: 'verify',
              },
            ],
            [
              {
                text: '📱 Open Coinbase Wallet',
                url: `https://wallet.coinbase.com/?address=0xec9b8ED76BA8691796410768C332D0452676984b`,
              },
            ],
            [{ text: '🔄 Refresh', callback_data: 'handleWallet' }],
            [{ text: '❓ Help', callback_data: 'help' }],
          ],
        },
      },
    );
  }

  async handleHelp(msg: Message) {
    await this.bot.sendMessage(
      msg.chat.id,
      `
Here's how MagnifyCash works:

1️⃣ Verify Identity: Multiple verification options
 • World ID biometric verification
 • Coinbase KYC (Coming Soon)
 • Civic (Coming Soon)

2️⃣ Create Wallet: Automated setup with no gas fees
3️⃣ Get a Loan: Choose amount and duration
4️⃣ Receive Funds: Quick transfer to your wallet
5️⃣ Repay: Easy repayment through the bot

💫 Earn 1.5% back in $MAG Tokens on loan repayment!

Available commands:
/start - Create wallet and begin
/verify - Complete verification
/wallet - View wallet details
/getloan - Get a Loan
/help - Show this message
    `,
    );
  }

  private async setWebHook(url: string): Promise<any> {
    try {
      return await this.bot.setWebHook(url);
    } catch (error) {
      this.logger.error(`Unable to set webhook: ${error}`);
      exit(1);
    }
  }

  processUpdate(update: Update): void {
    this.bot.processUpdate(update);
  }
}
