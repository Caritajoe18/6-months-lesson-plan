# Week 2 Assignments

---

## Assignment 1: Data Transformation Pipeline

**Objective:** Build a data transformation pipeline using `reduce()`, `map()`, and `filter()`.

### Problem Statement

You are given an array of sales transactions. Your task is to build a pipeline that processes this data and generates a report.

### Starter Data

```js
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
```

### Requirements

#### Part A: Basic Pipeline

1. **Get completed transactions:**
   ```js
   getCompletedTransactions(transactions) → [...]
   ```

2. **Get product names of completed transactions:**
   ```js
   getCompletedProductNames(transactions) → ["Laptop", "Phone", ...]
   ```

3. **Calculate total revenue from completed transactions:**
   ```js
   getTotalRevenue(transactions) → number
   ```

#### Part B: Advanced Pipeline

4. **Get summary by status:**
   ```js
   getStatusSummary(transactions) → { completed: 5, refunded: 2, pending: 1 }
   ```

5. **Get average transaction amount:**
   ```js
   getAverageAmount(transactions) → number
   ```

6. **Find the most expensive completed transaction:**
   ```js
   getMostExpensive(transactions) → { id: 1, product: "Laptop", ... }
   ```

#### Part C: Bonus

7. **Group transactions by month:**
   ```js
   groupByMonth(transactions) → { "2025-01": [...all transactions] }
   ```

8. **Build a full report object:**
   ```js
   generateReport(transactions) → {
     totalTransactions: 8,
     completedCount: 5,
     totalRevenue: 2780,
     averageAmount: 435,
     highestSale: { ... },
     lowestSale: { ... }
   }
   ```

### Submission

- File: `data-pipeline.js`
- Must use `map()`, `filter()`, and `reduce()` at least once
- Run with: `node data-pipeline.js`

---

## Assignment 2: Modern ES6 Utility Library

**Objective:** Build a utility library with `deepClone`, `debounce`, and `throttle` using modern ES6+ syntax.

### Problem Statement

Create a utility library using ES6 classes, arrow functions, and modern JavaScript patterns.

### Requirements

#### Part A: deepClone

Create a function that creates a deep copy of an object or array.

```js
const original = {
  name: "Ada",
  address: {
    city: "Lagos",
    coordinates: { lat: 6.5, lng: 3.4 }
  },
  hobbies: ["reading", "coding"]
};

const clone = deepClone(original);

// Prove it's a deep clone
clone.address.city = "Abuja";
console.log(original.address.city); // "Lagos" — unchanged!
```

**Requirements:**
- Handle nested objects
- Handle arrays
- Handle primitive values
- Do NOT use `JSON.parse(JSON.stringify())` — implement it yourself

#### Part B: debounce

Create a debounce function that delays invoking a function until after a wait period.

```js
const log = debounce((msg) => console.log(msg), 300);

log("hello"); // executes after 300ms
log("hello"); // resets timer
log("hello"); // resets timer — only the last call executes
```

**Requirements:**
- Return a function
- Cancel method to abort pending invocations
- Use modern ES6+ syntax (classes or closures)

#### Part C: throttle

Create a throttle function that limits how often a function can be called.

```js
const throttledLog = throttle((msg) => console.log(msg), 1000);

throttledLog("a"); // executes immediately
throttledLog("b"); // ignored — within 1000ms
throttledLog("c"); // ignored — within 1000ms
// ... 1 second passes
throttledLog("d"); // executes
```

**Requirements:**
- Return a function
- Leading edge (execute on first call)
- Trailing edge option (execute last call after wait)
- Use modern ES6+ syntax

#### Part D: Bonus

Create additional utilities:
- `debounce` with `immediate` option (execute on leading edge)
- `throttle` with `cancel()` method
- `memoize` function for caching results

### Submission

- File: `utilities.js`
- Include example usage with `console.log()`
- Run with: `node utilities.js`

---

## Assignment 3: Refactor Legacy Code to ES6 Modules

**Objective:** Take a legacy-style script and refactor it into clean ES6 modules.

### Legacy Code to Refactor

```js
// legacy-script.js
var students = [
  { name: "Ada", grade: "A", score: 92 },
  { name: "John", grade: "B", score: 78 },
  { name: "Mary", grade: "A", score: 95 },
  { name: "Bob", grade: "C", score: 65 },
  { name: "Eve", grade: "B", score: 82 }
];

function getStudentsByGrade(students, grade) {
  var result = [];
  for (var i = 0; i < students.length; i++) {
    if (students[i].grade === grade) {
      result.push(students[i]);
    }
  }
  return result;
}

function calculateAverage(students) {
  var total = 0;
  for (var i = 0; i < students.length; i++) {
    total += students[i].score;
  }
  return total / students.length;
}

function getTopStudents(students, count) {
  var sorted = students.slice().sort(function(a, b) {
    return b.score - a.score;
  });
  return sorted.slice(0, count);
}

function formatStudent(student) {
  return student.name + " - " + student.grade + " (" + student.score + ")";
}

function printReport(students) {
  console.log("=== Student Report ===");
  for (var i = 0; i < students.length; i++) {
    console.log(formatStudent(students[i]));
  }
  console.log("Average: " + calculateAverage(students));
}
```

### Requirements

#### Part A: Convert to ES6 Modules

1. **`students.js`** — Export the students array
2. **`grades.js`** — Export `getStudentsByGrade()`
3. **`statistics.js`** — Export `calculateAverage()`, `getTopStudents()`
4. **`formatters.js`** — Export `formatStudent()`
5. **`report.js`** — Export `printReport()`
6. **`index.js`** — Import and run

#### Part B: Modernize the Code

- Replace `var` with `const`/`let`
- Use arrow functions where appropriate
- Use `map()`, `filter()`, `reduce()` instead of manual loops
- Use template literals instead of string concatenation
- Use destructuring where beneficial
- Use default parameters

#### Part C: Add New Features

Add these new functions using ES6+ syntax:

```js
// Add to statistics.js
getGradeDistribution(students) → { A: 2, B: 2, C: 1 }
getPassingStudents(students, passScore = 50) → [...]
getStudentByName(students, name) → student | undefined
```

### Submission

- Files: `index.js`, `students.js`, `grades.js`, `statistics.js`, `formatters.js`, `report.js`
- Run with: `node index.js`

---

## Grading Criteria

| Criteria | Points |
|----------|--------|
| Correctness (runs without errors) | 40% |
| ES6+ syntax usage | 25% |
| Code organization and readability | 20% |
| Immutability practices | 15% |

## Tips

1. Start with the simplest version first, then add complexity
2. Test each function individually before combining
3. Use `console.log()` liberally while developing
4. Check that your refactored code produces the same output as the original
