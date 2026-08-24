const transactions = [
  { id: 1, product: "Laptop", amount: 1200, status: "completed", date: "2025-01-15" },
  { id: 2, product: "Phone", amount: 800, status: "completed", date: "2025-01-16" },
  { id: 3, product: "Tablet", amount: 500, status: "refunded", date: "2025-01-17" },
  { id: 4, product: "Monitor", amount: 350, status: "completed", date: "2025-01-18" },
  { id: 5, product: "Keyboard", amount: 120, status: "pending", date: "2025-01-19" },
  { id: 6, product: "Mouse", amount: 80, status: "completed", date: "2025-01-20" },
  { id: 7, product: "Headphones", amount: 250, status: "completed", date: "2025-01-21" },
  { id: 8, product: "Webcam", amount: 180, status: "refunded", date: "2025-01-22" }
];

// Basic Pipeline

function getCompletedTransactions(transactions) {
  return transactions.filter(transaction => {
    return transaction.status === "completed";
  });
}

function getCompletedProductNames(transactions) {
  return getCompletedTransactions(transactions).map(transaction => {
    return transaction.product;
  });
}

function getTotalRevenue(transactions) {
  return getCompletedTransactions(transactions).reduce((total, transaction) => {
    return total + transaction.amount;
  }, 0);
}



function getStatusSummary(transactions) {
  return transactions.reduce((summary, transaction) => {
    const status = transaction.status;

    if (!summary[status]) {
      summary[status] = 0;
    }

    summary[status]++;

    return summary;
  }, {});
}

function getAverageAmount(transactions) {
  if (transactions.length === 0) {
    return 0;
  }

  const total = transactions.reduce((sum, transaction) => {
    return sum + transaction.amount;
  }, 0);

  return total / transactions.length;
}

function getMostExpensive(transactions) {
  const completed = getCompletedTransactions(transactions);

  if (completed.length === 0) {
    return null;
  }

  return completed.reduce((highest, transaction) => {
    if (transaction.amount > highest.amount) {
      return transaction;
    }

    return highest;
  });
}

// Bonus

function groupByMonth(transactions) {
  return transactions.reduce((months, transaction) => {
    const month = transaction.date.slice(0, 7);

    if (!months[month]) {
      months[month] = [];
    }

    months[month].push(transaction);

    return months;
  }, {});
}

function generateReport(transactions) {
  const completedTransactions = getCompletedTransactions(transactions);

  return {
    totalTransactions: transactions.length,
    completedCount: completedTransactions.length,
    totalRevenue: getTotalRevenue(transactions),
    averageAmount: getAverageAmount(transactions),
    highestSale: getMostExpensive(transactions),

    lowestSale: transactions.reduce((lowest, transaction) => {
      if (transaction.amount < lowest.amount) {
        return transaction;
      }

      return lowest;
    })
  };
}

// Testing the functions

console.log("Completed Transactions:");
console.log(getCompletedTransactions(transactions));

console.log("\nCompleted Product Names:");
console.log(getCompletedProductNames(transactions));

console.log("\nTotal Revenue:");
console.log(getTotalRevenue(transactions));

console.log("\nStatus Summary:");
console.log(getStatusSummary(transactions));

console.log("\nAverage Transaction Amount:");
console.log(getAverageAmount(transactions));

console.log("\nMost Expensive Completed Transaction:");
console.log(getMostExpensive(transactions));

console.log("\nTransactions Grouped By Month:");
console.log(groupByMonth(transactions));

console.log("\nFull Report:");
console.log(generateReport(transactions));