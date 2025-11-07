// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set default start date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    
    // Calculate fees on loan amount change
    document.getElementById('loanAmount').addEventListener('input', calculateFees);
    
    // Calculate on button click
    document.getElementById('calculateBtn').addEventListener('click', calculateLoan);
    
    // Copy schedule button
    document.getElementById('copyScheduleBtn').addEventListener('click', copyScheduleForContract);
    
    // Download PDF button
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);
    
    // Auto-calculate fees initially
    calculateFees();
});

function calculateFees() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    
    // Calculate each fee based on fixed percentages
    const appFeePercent = 1; // 1%
    const procFeePercent = 2; // 2%
    const insFeePercent = 1;  // 1%
    const monFeePercent = 2;  // 2%
    
    const appFeeCalc = (loanAmount * appFeePercent / 100);
    const procFeeCalc = (loanAmount * procFeePercent / 100);
    const insFeeCalc = (loanAmount * insFeePercent / 100);
    const monFeeCalc = (loanAmount * monFeePercent / 100);
    
    // Update display
    document.getElementById('appFeeCalc').textContent = Math.round(appFeeCalc).toLocaleString();
    document.getElementById('procFeeCalc').textContent = Math.round(procFeeCalc).toLocaleString();
    document.getElementById('insFeeCalc').textContent = Math.round(insFeeCalc).toLocaleString();
    document.getElementById('monFeeCalc').textContent = Math.round(monFeeCalc).toLocaleString();
    
    const totalFees = appFeeCalc + procFeeCalc + insFeeCalc + monFeeCalc;
    document.getElementById('totalFees').textContent = Math.round(totalFees).toLocaleString();
}

function calculateLoan() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const repaymentPeriod = parseInt(document.getElementById('repaymentPeriod').value);
    const repaymentMode = document.getElementById('repaymentMode').value;
    const interestType = document.getElementById('interestType').value;
    const startDate = new Date(document.getElementById('startDate').value);
    
    if (!loanAmount || !repaymentPeriod || !startDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Calculate effective interest rate based on repayment mode
    const monthlyInterestRate = 3.5; // Fixed 3.5% monthly
    let effectiveInterestRate;
    let periodsPerMonth;
    let totalPeriods;
    
    switch(repaymentMode) {
        case 'monthly':
            effectiveInterestRate = monthlyInterestRate / 100;
            periodsPerMonth = 1;
            totalPeriods = repaymentPeriod;
            break;
        case 'biweekly':
            effectiveInterestRate = monthlyInterestRate / 100 / 2; // Half of monthly
            periodsPerMonth = 2;
            totalPeriods = repaymentPeriod * 2;
            break;
        case 'weekly':
            effectiveInterestRate = monthlyInterestRate / 100 / 4; // Quarter of monthly
            periodsPerMonth = 4;
            totalPeriods = repaymentPeriod * 4;
            break;
        case 'daily':
            effectiveInterestRate = monthlyInterestRate / 100 / 30; // Approximately daily
            periodsPerMonth = 30;
            totalPeriods = repaymentPeriod * 30;
            break;
    }
    
    // Calculate fees
    const totalFees = parseFloat(document.getElementById('totalFees').textContent.replace(/,/g, ''));
    
    // Calculate net disbursement
    const procFeeMode = document.getElementById('procFeeMode').value;
    const insFeeMode = document.getElementById('insFeeMode').value;
    const monFeeMode = document.getElementById('monFeeMode').value;
    
    let netDisbursement = loanAmount;
    
    if (procFeeMode === 'deducted') {
        netDisbursement -= parseFloat(document.getElementById('procFeeCalc').textContent.replace(/,/g, ''));
    }
    if (insFeeMode === 'deducted') {
        netDisbursement -= parseFloat(document.getElementById('insFeeCalc').textContent.replace(/,/g, ''));
    }
    if (monFeeMode === 'deducted') {
        netDisbursement -= parseFloat(document.getElementById('monFeeCalc').textContent.replace(/,/g, ''));
    }
    
    // Calculate installment based on interest type
    let installment, schedule, totalRepayment;
    
    if (interestType === 'reducing') {
        // Reducing balance calculation
        const rate = effectiveInterestRate;
        if (rate === 0) {
            installment = loanAmount / totalPeriods;
        } else {
            const numerator = loanAmount * rate * Math.pow(1 + rate, totalPeriods);
            const denominator = Math.pow(1 + rate, totalPeriods) - 1;
            installment = numerator / denominator;
        }
        
        schedule = generateReducingBalanceSchedule(loanAmount, effectiveInterestRate, installment, totalPeriods, startDate, repaymentMode);
        totalRepayment = installment * totalPeriods;
    } else {
        // Flat interest calculation
        const totalInterest = loanAmount * (monthlyInterestRate / 100) * repaymentPeriod;
        totalRepayment = loanAmount + totalInterest;
        installment = totalRepayment / totalPeriods;
        
        schedule = generateFlatRateSchedule(loanAmount, monthlyInterestRate, repaymentPeriod, totalPeriods, installment, startDate, repaymentMode, periodsPerMonth);
    }
    
    // Display results
    displayResults(loanAmount, netDisbursement, totalFees, installment, totalRepayment, repaymentMode);
    displaySchedule(schedule);
}

function generateReducingBalanceSchedule(principal, rate, installment, periods, startDate, repaymentMode) {
    const schedule = [];
    let outstanding = principal;
    let currentDate = new Date(startDate);
    
    for (let i = 1; i <= periods; i++) {
        // Calculate next payment date based on repayment mode
        currentDate = calculateNextDate(currentDate, repaymentMode);
        
        const interest = outstanding * rate;
        const principalPayment = Math.min(installment - interest, outstanding);
        const actualInstallment = principalPayment + interest;
        
        schedule.push({
            period: i,
            date: new Date(currentDate),
            principal: principalPayment,
            interest: interest,
            installment: actualInstallment,
            outstanding: Math.max(0, outstanding - principalPayment)
        });
        
        outstanding -= principalPayment;
        if (outstanding <= 0) break;
    }
    
    return schedule;
}

function generateFlatRateSchedule(principal, monthlyRate, repaymentMonths, totalPeriods, installment, startDate, repaymentMode, periodsPerMonth) {
    const schedule = [];
    let outstanding = principal;
    const totalInterest = principal * (monthlyRate / 100) * repaymentMonths;
    const totalRepayment = principal + totalInterest;
    const principalPerPeriod = principal / totalPeriods;
    const interestPerPeriod = totalInterest / totalPeriods;
    let currentDate = new Date(startDate);
    
    for (let i = 1; i <= totalPeriods; i++) {
        currentDate = calculateNextDate(currentDate, repaymentMode);
        
        const remainingPeriods = totalPeriods - i + 1;
        const actualPrincipal = principalPerPeriod;
        const actualInterest = interestPerPeriod;
        const actualInstallment = actualPrincipal + actualInterest;
        
        schedule.push({
            period: i,
            date: new Date(currentDate),
            principal: actualPrincipal,
            interest: actualInterest,
            installment: actualInstallment,
            outstanding: Math.max(0, outstanding - actualPrincipal)
        });
        
        outstanding -= actualPrincipal;
        if (outstanding <= 0) break;
    }
    
    return schedule;
}

function calculateNextDate(currentDate, repaymentMode) {
    const newDate = new Date(currentDate);
    
    switch(repaymentMode) {
        case 'monthly':
            newDate.setMonth(newDate.getMonth() + 1);
            break;
        case 'biweekly':
            newDate.setDate(newDate.getDate() + 14);
            break;
        case 'weekly':
            newDate.setDate(newDate.getDate() + 7);
            break;
        case 'daily':
            newDate.setDate(newDate.getDate() + 1);
            break;
    }
    
    return newDate;
}

function displayResults(loanAmount, netDisbursement, totalFees, installment, totalRepayment, repaymentMode) {
    const resultsDiv = document.getElementById('results');
    
    resultsDiv.innerHTML = `
        <h3>Loan Summary</h3>
        <p><strong>Loan Amount:</strong> ${Math.round(loanAmount).toLocaleString()} TZS</p>
        <p><strong>Net Disbursement:</strong> ${Math.round(netDisbursement).toLocaleString()} TZS</p>
        <p><strong>Total Fees:</strong> ${Math.round(totalFees).toLocaleString()} TZS</p>
        <p><strong>${repaymentMode.charAt(0).toUpperCase() + repaymentMode.slice(1)} Installment:</strong> ${Math.round(installment).toLocaleString()} TZS</p>
        <p><strong>Total Repayment:</strong> ${Math.round(totalRepayment).toLocaleString()} TZS</p>
        <p><strong>Total Interest:</strong> ${Math.round(totalRepayment - loanAmount).toLocaleString()} TZS</p>
    `;
}

function displaySchedule(schedule) {
    const scheduleBody = document.getElementById('scheduleBody');
    scheduleBody.innerHTML = '';
    
    schedule.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.period}</td>
            <td>${item.date.toLocaleDateString()}</td>
            <td>${item.date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
            <td>${Math.round(item.principal).toLocaleString()}</td>
            <td>${Math.round(item.interest).toLocaleString()}</td>
            <td>${Math.round(item.installment).toLocaleString()}</td>
            <td>${Math.round(item.outstanding).toLocaleString()}</td>
        `;
        scheduleBody.appendChild(row);
    });
}

function copyScheduleForContract() {
    const scheduleTable = document.getElementById('scheduleTable');
    const range = document.createRange();
    range.selectNode(scheduleTable);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            alert('Schedule copied to clipboard! You can now paste it into your contract document.');
        } else {
            alert('Failed to copy schedule. Please try again.');
        }
    } catch (err) {
        alert('Error copying schedule: ' + err);
    }
    
    window.getSelection().removeAllRanges();
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Loan Repayment Schedule', 105, 15, { align: 'center' });
    
    // Add loan details
    doc.setFontSize(12);
    const loanAmount = document.getElementById('loanAmount').value;
    const repaymentPeriod = document.getElementById('repaymentPeriod').value;
    const repaymentMode = document.getElementById('repaymentMode').options[document.getElementById('repaymentMode').selectedIndex].text;
    
    doc.text(`Loan Amount: ${parseFloat(loanAmount).toLocaleString()} TZS`, 14, 25);
    doc.text(`Repayment Period: ${repaymentPeriod} Months`, 14, 32);
    doc.text(`Repayment Mode: ${repaymentMode}`, 14, 39);
    doc.text(`Interest Rate: 3.5% Monthly`, 14, 46);
    
    // Add schedule table
    doc.autoTable({
        html: '#scheduleTable',
        startY: 55,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Save the PDF
    doc.save('loan-schedule.pdf');
}
const CACHE_NAME = 'loan-calc-v1';
const urlsToCache = ['/', '/index.html', '/style.css', '/script.js', '/icon-192x192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered: ', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed: ', error);
      });
  });

}
