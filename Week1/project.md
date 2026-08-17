# JavaScript Fundamentals — Student Result Analyzer

## Objective

Build a JavaScript program that analyzes the results of a group of students and prints a simple performance report to the console.

Your solution should demonstrate your understanding of:

* `let`, `const`, and `var`
* JavaScript data types
* Type coercion
* Template literals
* Arithmetic, comparison, logical, and assignment operators
* `if / else if / else`
* `for`, `while`, or `for...of` loops
* Functions
* Function declarations vs function expressions
* Hoisting
* Scope
* Strings and arrays
* Console debugging
* Running JavaScript using Node.js

---

## Problem Statement

You are building a simple **Student Result Analyzer**.

The program receives a list of students. Each student has:

* A name
* An age
* Scores for three subjects

Example:

```js
const students = [
  {
    name: "Ada",
    age: "20",
    scores: [75, 82, 68]
  },
  {
    name: "John",
    age: "22",
    scores: [45, 51, 49]
  },
  {
    name: "Mary",
    age: "19",
    scores: [90, 88, 95]
  }
];
```

Notice that `age` is stored as a **string**, even though it represents a number.

Your program must process this data and produce a report for every student.

---

# Requirements

### 1. Calculate the Total Score

Create a function:

```js
calculateTotal(scores)
```

The function should accept an array of scores and return the student's total score.

Example:

```text
[75, 82, 68] → 225
```

---

### 2. Calculate the Average

Create a function:

```js
calculateAverage(scores)
```

The function should calculate and return the student's average score.

For example:

```text
[75, 82, 68] → 75
```

You may round the result if necessary.

---

### 3. Determine the Grade

Create a function:

```js
getGrade(average)
```

Use the following grading system:

| Average  | Grade |
| -------- | ----- |
| 70 - 100 | A     |
| 60 - 69  | B     |
| 50 - 59  | C     |
| 40 - 49  | D     |
| Below 40 | F     |

---

### 4. Determine Pass or Fail

Create a function:

```js
getStatus(average)
```

A student passes if their average is **50 or higher**.

Otherwise, they fail.

Example:

```text
Average: 75
Status: PASS
```

---

### 5. Handle Type Coercion

The student's age is stored as a string:

```js
age: "20"
```

Convert it to a number before performing any mathematical operation.

Your program should demonstrate that you understand the difference between:

```js
"20" + 5
```

and:

```js
Number("20") + 5
```

Add a console statement demonstrating the difference.

---

### 6. Generate a Student Report

For every student, print something similar to:

```text
==============================
Student: Ada
Age: 20
Total Score: 225
Average: 75
Grade: A
Status: PASS
==============================
```

Use **template literals** when generating the report.

---

### 7. Process All Students

Use a loop to process every student in the array.

Do **not** manually process each student like this:

```js
console.log(students[0]);
console.log(students[1]);
console.log(students[2]);
```

Instead, use a loop.

You may use:

```js
for
```

```js
for...of
```

or:

```js
while
```

---

# Additional Requirements

Your program must contain at least:

### Variables

Use both:

```js
const
```

and:

```js
let
```

You should also explain in a comment why you would **not normally use `var`** in modern JavaScript.

---

### Functions

Your program should contain at least **three functions**.

Use both:

* A function declaration
* A function expression

For example:

```js
function calculateTotal(scores) {
  // ...
}

const calculateAverage = function (scores) {
  // ...
};
```

---

### Scope

Create a variable inside a function and demonstrate that it cannot be accessed outside that function.

Add a comment explaining why.

---

### String Operations

Use at least **two string methods**.

For example:

```js
toUpperCase()
```

```js
toLowerCase()
```

```js
trim()
```

```js
includes()
```

You could convert the student's name to uppercase when displaying the report.

---

### Array Operations

Use at least **two array operations**.

For example:

```js
push()
```

```js
length
```

```js
for...of
```

```js
map()
```

```js
filter()
```

---

# Bonus Challenge

Add a function:

```js
getBestStudent(students)
```

The function should determine which student has the highest average.

Example output:

```text
🏆 Best Student: MARY
Average: 91
Grade: A
```

Then add another function:

```js
getClassAverage(students)
```

which calculates the average score of the entire class.

Example:

```text
Class Average: 72.4
```

---

# Debugging Requirement

Your program must contain at least **three `console.log()` statements used for debugging** while developing the solution.

For example:

```js
console.log("Processing student:", student.name);
console.log("Scores:", student.scores);
console.log("Calculated average:", average);
```

Once your program works, you may remove unnecessary debugging logs.

---

# Running the Program

Create a file called:

```text
student-result-analyzer.js
```

Run it using Node.js:

```bash
node student-result-analyzer.js
```

The program should run without errors.

---

# Expected Skills Being Tested

By completing this assignment, you should demonstrate that you understand:

| Topic                   | Where it is used             |
| ----------------------- | ---------------------------- |
| `let` / `const` / `var` | Variable declarations        |
| Data types              | Student data and scores      |
| Type coercion           | Student age                  |
| Template literals       | Student report               |
| Operators               | Calculations and comparisons |
| Conditionals            | Grade and pass/fail          |
| Loops                   | Processing students          |
| Functions               | Calculations and logic       |
| Function declaration    | `calculateTotal()`           |
| Function expression     | `calculateAverage()`         |
| Hoisting                | Explanation/comment          |
| Scope                   | Function variables           |
| Strings                 | Student names                |
| Arrays                  | Students and scores          |
| Console debugging       | Debugging the program        |
| Node.js                 | Running the script           |

## Submission

Submit:

1. `student-result-analyzer.js`
2. A short explanation of how your program works
3. A screenshot of the program running successfully in the terminal

### Challenge Rule

Try to solve the problem **without searching for a complete solution online**.

Focus on breaking the problem into smaller steps:

```text
Input
  ↓
Loop through students
  ↓
Calculate total
  ↓
Calculate average
  ↓
Determine grade
  ↓
Determine status
  ↓
Generate report
  ↓
Print result
```
