"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaUniversity, FaPaypal, FaCreditCard, FaInfoCircle, FaMoneyBillWave, FaArrowRight, FaTimes, FaWallet, FaEnvelope } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  availableBalance: number;
  onWithdraw: (amount: number, method: string, details: any) => Promise<void>;
}

interface WithdrawalDetails {
  bankName: string;
  accountNumber: string;
  holderName: string;
  swiftBic: string;
  bankAddress: string;
  accountIban: string;
  routingNumber: string;
  email: string;
  cardNumber: string;
  cardExpiry: string;
  cardCVV: string;
}

interface FieldErrors {
  [key: string]: string;
}

const withdrawalMethods = [
  {
    id: 'card' as const,
    name: 'Visa',
    icon: <FaCreditCard className="w-5 h-5" />,
    tooltip: "Withdraw funds to your Visa card"
  },
  {
    id: 'paypal' as const,
    name: 'PayPal',
    icon: <FaPaypal className="w-5 h-5" />,
    tooltip: "Fast withdrawal to your PayPal account"
  },
  {
    id: 'bank_transfer' as const,
    name: 'Bank',
    icon: <FaUniversity className="w-5 h-5" />,
    tooltip: "Transfer funds directly to your bank account"
  }
] as const;

type WithdrawalMethod = typeof withdrawalMethods[number]['id'];

export default function WithdrawModal({
  isOpen,
  onClose,
  userId,
  availableBalance,
  onWithdraw
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('bank_transfer');
  const [details, setDetails] = useState<WithdrawalDetails>({
    bankName: '',
    accountNumber: '',
    holderName: '',
    swiftBic: '',
    bankAddress: '',
    accountIban: '',
    routingNumber: '',
    email: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [operationCompleted, setOperationCompleted] = useState(false);

  // Улучшаем отслеживание баланса
  useEffect(() => {
    if (isOpen) {  // Проверяем баланс только когда модальное окно открыто
      console.log('WithdrawModal получил баланс:', {
        availableBalance,
        type: typeof availableBalance,
        isNull: availableBalance === null,
        isUndefined: availableBalance === undefined,
        isNaN: isNaN(Number(availableBalance))
      });
      // Сбрасываем флаг завершения операции при каждом открытии
      setOperationCompleted(false);
      setFieldErrors({});
    }
  }, [availableBalance, isOpen]);

  // Сбрасываем ошибки полей при смене метода
  useEffect(() => {
    setFieldErrors({});
  }, [method]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    // Убираем проверку на минимальную сумму
    if (!value || Number(value) <= 0) {
      setAmountError('Please enter a valid amount');
    } else {
      setAmountError('');
    }
  };

  const validateFields = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Валидация для банковского перевода
    if (method === 'bank_transfer') {
      if (!details.bankName) {
        errors.bankName = 'Bank name is required';
        isValid = false;
      }
      if (!details.accountNumber) {
        errors.accountNumber = 'Account number is required';
        isValid = false;
      }
      if (!details.holderName) {
        errors.holderName = 'Account holder name is required';
        isValid = false;
      }
      if (!details.swiftBic) {
        errors.swiftBic = 'SWIFT/BIC code is required';
        isValid = false;
      }
    }
    
    // Валидация для PayPal
    if (method === 'paypal') {
      if (!details.email) {
        errors.email = 'PayPal email is required';
        isValid = false;
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(details.email)) {
        errors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }
    
    // Валидация для карты
    if (method === 'card') {
      // Валидация номера карты - должно быть 16 цифр (убираем пробелы)
      const cardNumber = details.cardNumber.replace(/\s/g, '');
      if (!cardNumber) {
        errors.cardNumber = 'Card number is required';
        isValid = false;
      } else if (!/^\d{16}$/.test(cardNumber)) {
        errors.cardNumber = 'Card number must contain 16 digits';
        isValid = false;
      }
      
      // Валидация даты истечения срока действия (формат MM/YY)
      if (!details.cardExpiry) {
        errors.cardExpiry = 'Expiry date is required';
        isValid = false;
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(details.cardExpiry)) {
        errors.cardExpiry = 'Expiry date must be in MM/YY format';
        isValid = false;
      } else {
        // Проверка, что дата не истекла
        const [month, year] = details.cardExpiry.split('/');
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        const currentDate = new Date();
        
        if (expiryDate < currentDate) {
          errors.cardExpiry = 'Card has expired';
          isValid = false;
        }
      }
      
      // Валидация CVV (3-4 цифры)
      if (!details.cardCVV) {
        errors.cardCVV = 'CVV code is required';
        isValid = false;
      } else if (!/^\d{3,4}$/.test(details.cardCVV)) {
        errors.cardCVV = 'CVV must be 3 or 4 digits';
        isValid = false;
      }
      
      // Валидация имени держателя карты
      if (!details.holderName) {
        errors.holderName = 'Cardholder name is required';
        isValid = false;
      } else if (details.holderName.length < 3) {
        errors.holderName = 'Enter full cardholder name as on card';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Безопасно обрабатываем значение баланса
    const safeBalance = availableBalance !== undefined && availableBalance !== null 
      ? availableBalance 
      : 0;

    if (!amount || Number(amount) <= 0) {
      setAmountError('Please enter a valid amount');
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (Number(amount) > safeBalance) {
      setAmountError('Insufficient balance');
      toast.error('Insufficient balance for withdrawal');
      return;
    }

    // Валидация полей в зависимости от метода вывода
    if (!validateFields()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    try {
      setIsSubmitting(true);
      let withdrawalDetails;

      switch (method) {
        case 'bank_transfer':
          withdrawalDetails = {
            bank_transfer: {
              bank_name: details.bankName,
              account_number: details.accountNumber,
              account_holder: details.holderName,
              swift_bic: details.swiftBic,
              bank_address: details.bankAddress,
              iban: details.accountIban,
              routing_number: details.routingNumber
            }
          };
          break;
        case 'paypal':
          withdrawalDetails = {
            paypal: {
              email: details.email
            }
          };
          break;
        case 'card':
          withdrawalDetails = {
            visa_card: {
              card_number: details.cardNumber.replace(/\s/g, ''),
              expiry_date: details.cardExpiry,
              cvv: details.cardCVV,
              card_holder: details.holderName
            }
          };
          break;
      }

      await onWithdraw(Number(amount), method, withdrawalDetails);
      setOperationCompleted(true);
      
      // Сбрасываем форму после успешного вывода
      setAmount('');
      setDetails({
        bankName: '',
        accountNumber: '',
        holderName: '',
        swiftBic: '',
        bankAddress: '',
        accountIban: '',
        routingNumber: '',
        email: '',
        cardNumber: '',
        cardExpiry: '',
        cardCVV: '',
      });
    } catch (error) {
      console.error('Withdrawal submission error:', error);
      toast.error('Failed to process withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('WithdrawModal рендеринг с балансом:', {
    availableBalance,
    isOpen,
    operationCompleted
  });

  // Render the withdrawal form based on the selected method
  const renderWithdrawalForm = () => {
    return (
      <form
        onSubmit={handleSubmit}
        className="text-gray-100 space-y-5"
      >
        {/* Секция выбора метода */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">Withdrawal Method</label>
            <FaInfoCircle
              className="text-[#20DDBB] text-sm cursor-help"
              data-tooltip-id="method-tooltip"
              data-tooltip-content="Choose your preferred method to withdraw your royalty earnings"
            />
          </div>
          
          <div className="flex gap-3">
            {withdrawalMethods.map((withdrawMethod) => (
              <div key={withdrawMethod.id} className="flex-1">
                <input
                  type="radio"
                  id={`method-${withdrawMethod.id}`}
                  className="hidden peer"
                  checked={withdrawMethod.id === method}
                  onChange={() => setMethod(withdrawMethod.id)}
                />
                <label
                  htmlFor={`method-${withdrawMethod.id}`}
                  data-tooltip-id={`${withdrawMethod.id}-tooltip`}
                  data-tooltip-content={withdrawMethod.tooltip}
                  onClick={() => setMethod(withdrawMethod.id)}
                  className={`
                    flex flex-col items-center justify-center py-4 px-2 rounded-lg cursor-pointer border transition-all duration-200
                    ${withdrawMethod.id === method 
                      ? 'bg-gradient-to-br from-[#20DDBB]/10 to-[#1f2942] border-[#20DDBB]/30 shadow-lg shadow-[#20DDBB]/5' 
                      : 'bg-[#1f2942]/60 border-white/5 hover:bg-[#1f2942]/80 hover:border-[#20DDBB]/10'
                    }
                  `}
                >
                  <div className={`p-2.5 rounded-full mb-2 ${
                    withdrawMethod.id === method 
                      ? 'bg-[#20DDBB]/15 text-[#20DDBB]' 
                      : 'bg-[#1A2338]/60 text-gray-400'
                  }`}>
                    {withdrawMethod.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    withdrawMethod.id === method ? 'text-[#20DDBB]' : 'text-gray-300'
                  }`}>
                    {withdrawMethod.name}
                  </span>
                </label>
                <Tooltip id={`${withdrawMethod.id}-tooltip`} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Поле ввода суммы */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">
              Amount (USD)
            </label>
            <div className="flex items-center gap-1">
              <FaMoneyBillWave className="text-[#20DDBB] text-sm" />
              <span className="text-[#20DDBB] text-sm font-medium">
                Available: ${availableBalance?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <FaMoneyBillWave className="text-gray-400" />
            </div>
            <input
              type="number"
              step="0.01"
              className={`bg-[#1f2942]/80 border ${
                amountError ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
              } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              onBlur={() => {
                if (amount && !amountError) {
                  setAmount(parseFloat(amount).toFixed(2));
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
              <span className="text-gray-400 font-medium">USD</span>
            </div>
          </div>
          
          {amountError && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
              <FaInfoCircle /> {amountError}
            </p>
          )}
        </div>

        {/* Поля ввода в зависимости от выбранного метода */}
        {method === 'card' && (
          <>
            <div className="mb-4">
              <div className="mb-2 flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Card Number</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <FaCreditCard className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={details.cardNumber}
                  onChange={(e) => setDetails({...details, cardNumber: e.target.value})}
                  className={`bg-[#1f2942]/80 border ${
                    fieldErrors.cardNumber ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                  } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
                />
              </div>
              {fieldErrors.cardNumber && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.cardNumber}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="mb-4">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-300">Expiry Date</label>
                </div>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={details.cardExpiry}
                  onChange={(e) => setDetails({...details, cardExpiry: e.target.value})}
                  className={`bg-[#1f2942]/80 border ${
                    fieldErrors.cardExpiry ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                  } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
                />
                {fieldErrors.cardExpiry && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.cardExpiry}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-300">CVV</label>
                </div>
                <input
                  type="text"
                  placeholder="123"
                  value={details.cardCVV}
                  onChange={(e) => setDetails({...details, cardCVV: e.target.value})}
                  className={`bg-[#1f2942]/80 border ${
                    fieldErrors.cardCVV ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                  } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
                />
                {fieldErrors.cardCVV && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.cardCVV}</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Cardholder Name</label>
              </div>
              <input
                type="text"
                placeholder="John Doe"
                value={details.holderName}
                onChange={(e) => setDetails({...details, holderName: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.holderName ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
              {fieldErrors.holderName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.holderName}</p>
              )}
            </div>

            <div>
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/10">
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#9BA3BF]">
                    Card information is processed securely and is not stored on our servers.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {method === 'paypal' && (
          <div className="mb-4">
            <div className="mb-2 flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">PayPal Email</label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="your-email@example.com"
                value={details.email}
                onChange={(e) => setDetails({...details, email: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.email ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
            )}
            <p className="mt-2 text-xs text-[#9BA3BF]">
              Enter the email address associated with your PayPal account
            </p>
          </div>
        )}

        {method === 'bank_transfer' && (
          <>
            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Bank Name</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <FaUniversity className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your bank name"
                  value={details.bankName}
                  onChange={(e) => setDetails({...details, bankName: e.target.value})}
                  className={`bg-[#1f2942]/80 border ${
                    fieldErrors.bankName ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                  } text-white py-3 px-10 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
                />
              </div>
              {fieldErrors.bankName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.bankName}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Account Holder Name</label>
              </div>
              <input
                type="text"
                placeholder="Full name as it appears on your account"
                value={details.holderName}
                onChange={(e) => setDetails({...details, holderName: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.holderName ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
              {fieldErrors.holderName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.holderName}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Account Number</label>
              </div>
              <input
                type="text"
                placeholder="Your bank account number"
                value={details.accountNumber}
                onChange={(e) => setDetails({...details, accountNumber: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.accountNumber ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
              {fieldErrors.accountNumber && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.accountNumber}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">SWIFT/BIC Code</label>
              </div>
              <input
                type="text"
                placeholder="Bank identification code"
                value={details.swiftBic}
                onChange={(e) => setDetails({...details, swiftBic: e.target.value})}
                className={`bg-[#1f2942]/80 border ${
                  fieldErrors.swiftBic ? 'border-red-500/50' : 'border-white/10 focus:border-[#20DDBB]/50'
                } text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30`}
              />
              {fieldErrors.swiftBic && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.swiftBic}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="mb-4">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-300">IBAN (Optional)</label>
                </div>
                <input
                  type="text"
                  placeholder="International bank account number"
                  value={details.accountIban}
                  onChange={(e) => setDetails({...details, accountIban: e.target.value})}
                  className="bg-[#1f2942]/80 border border-white/10 focus:border-[#20DDBB]/50 text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30"
                />
              </div>
              
              <div className="mb-4">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-300">Routing Number (Optional)</label>
                </div>
                <input
                  type="text"
                  placeholder="For US bank accounts"
                  value={details.routingNumber}
                  onChange={(e) => setDetails({...details, routingNumber: e.target.value})}
                  className="bg-[#1f2942]/80 border border-white/10 focus:border-[#20DDBB]/50 text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-300">Bank Address (Optional)</label>
              </div>
              <textarea
                placeholder="Full address of your bank branch"
                value={details.bankAddress}
                onChange={(e) => setDetails({...details, bankAddress: e.target.value})}
                className="bg-[#1f2942]/80 border border-white/10 focus:border-[#20DDBB]/50 text-white py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30 resize-none h-24"
              />
            </div>
          </>
        )}

        {/* Кнопка отправки */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !!amountError}
            className={`
              w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-white font-medium
              transition-all duration-200
              ${isSubmitting || !!amountError
                ? 'bg-gray-600/50 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-[#20DDBB] to-[#20DDBB]/80 hover:shadow-lg hover:shadow-[#20DDBB]/20'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Request Withdrawal</span>
                <FaArrowRight />
              </>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render the success state after withdrawal is completed
  const renderSuccessState = () => {
    return (
      <div
      className="text-center py-8"
    >
      <div className="mb-6 inline-flex p-5 rounded-full bg-[#20DDBB]/10 text-[#20DDBB]">
        <FaWallet className="w-12 h-12" />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">Withdrawal Requested</h3>
      <p className="text-gray-400 mb-6 max-w-xs mx-auto">
        Your withdrawal request has been submitted successfully and is now being processed.
      </p>
      
      <div className="mb-6 px-6 py-5 rounded-lg bg-[#1f2942]/60 border border-[#20DDBB]/10 text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-400">Method</span>
          <span className="text-white font-medium capitalize">{method.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Amount</span>
          <span className="text-[#20DDBB] font-semibold">${parseFloat(amount).toFixed(2)}</span>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-[#1f2942]/80 border border-white/10 text-white font-medium hover:bg-[#1f2942] transition-all duration-200"
      >
        <span>Close</span>
      </button>
      </div>
  );
  };

  // Fix for mobile scrolling issues
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose}
          />

          {/* Modal */}
          <div
            className="relative bg-[#1A2338]/80 backdrop-blur-xl text-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden z-10 border border-[#3f2d63]/30"
          >
            {/* Close button */}
              <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white transition-colors hover:bg-[#3f2d63]/50 z-20"
              aria-label="Close"
              >
              <FaTimes className="w-5 h-5" />
              </button>

            {/* Header */}
            <div className="px-6 py-5 border-b border-[#3f2d63]/30 bg-gradient-to-r from-[#3f2d63]/50 via-[#4e9ab3]/30 to-transparent backdrop-blur-md">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-[#20DDBB]/30 to-[#3f2d63]/30 rounded-full flex items-center justify-center shadow-inner backdrop-blur-sm mr-3">
                  <FaMoneyBillWave className="text-[#20DDBB] text-xl animate-floatY" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-[#cfd1e1] bg-clip-text text-transparent">Withdraw Funds</h2>
              </div>
              <p className="text-[#9BA3BF] text-sm mt-2 pl-[52px]">Transfer your earnings to your preferred payment method</p>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Show success screen or the form based on operation status */}
              {operationCompleted ? (
                renderSuccessState()
              ) : (
                renderWithdrawalForm()
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 