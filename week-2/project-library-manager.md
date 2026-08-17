# Project: In-Memory Library Manager CLI

## Objective

Build a command-line interface (CLI) application that manages an in-memory collection of books. This project combines all Week 2 concepts: objects, arrays, ES6+ features, and immutability principles.

---

## Problem Statement

You are building a **Library Manager** — a CLI tool that lets users manage a collection of books. The application runs in the terminal and accepts user input to perform CRUD operations (Create, Read, Update, Delete), search for books, and view statistics.

---

## Data Structure

Each book is an object with the following properties:

```js
const book = {
  id: 1,
  title: "JavaScript: The Good Parts",
  author: "Douglas Crockford",
  year: 2008,
  genre: "Programming",
  available: true
};
```

---

## Features

### 1. Add a Book

The user provides:
- Title
- Author
- Year (number)
- Genre

**Requirements:**
- Generate a unique `id` (use a counter or `Date.now()`)
- Default `available` to `true`
- Validate that title and author are not empty
- Validate that year is a valid number

**Example output:**
```
Book added successfully!
ID: 1
Title: JavaScript: The Good Parts
Author: Douglas Crockford
```

---

### 2. List All Books

Display all books in a formatted table.

**Requirements:**
- Show: ID, Title, Author, Year, Genre, Available
- Use template literals for formatting
- Handle empty library gracefully

**Example output:**
```
=== Library Collection (3 books) ===

ID | Title                          | Author              | Year | Genre        | Available
---|--------------------------------|---------------------|------|--------------|----------
1  | JavaScript: The Good Parts     | Douglas Crockford   | 2008 | Programming  | Yes
2  | Eloquent JavaScript            | Marijn Haverbeke    | 2018 | Programming  | Yes
3  | The Pragmatic Programmer       | David Thomas        | 2019 | Programming  | No
```

---

### 3. Find a Book

Search for books by:
- Title (partial match, case-insensitive)
- Author (partial match, case-insensitive)
- Genre (exact match)

**Requirements:**
- Return all matching books
- Display "No books found" if no matches
- Use `filter()` for searching

**Example:**
```
Search by (title/author/genre): title
Search term: javascript

Found 2 books:
1. JavaScript: The Good Parts — Douglas Crockford
2. Eloquent JavaScript — Marijn Haverbeke
```

---

### 4. Update a Book

Update a book's information by ID.

**Requirements:**
- Show current values before updating
- Allow updating any field
- Validate new values
- Use immutable update pattern (spread operator)

**Example:**
```
Enter book ID to update: 1

Current book:
Title: JavaScript: The Good Parts
Author: Douglas Crockford
Year: 2008
Genre: Programming

Enter new title (or press Enter to skip): JavaScript: The Good Parts, 2nd Edition
Enter new author (or press Enter to skip):
Enter new year (or press Enter to skip): 2020
Enter new genre (or press Enter to skip):

Book updated successfully!
```

---

### 5. Delete a Book

Remove a book by ID.

**Requirements:**
- Confirm before deleting
- Use `filter()` for immutable removal
- Display updated list after deletion

**Example:**
```
Enter book ID to delete: 1

Are you sure? (yes/no): yes

Book deleted successfully!
Remaining books: 2
```

---

### 6. Toggle Availability

Mark a book as available or unavailable.

**Requirements:**
- Toggle the `available` property
- Use immutable update

**Example:**
```
Enter book ID to toggle: 1

Book "JavaScript: The Good Parts" is now unavailable.
```

---

### 7. Statistics

Display statistics about the library.

**Requirements:**
- Total books
- Available vs unavailable
- Books by genre (count)
- Books by decade
- Oldest and newest book

**Example output:**
```
=== Library Statistics ===

Total books: 10
Available: 7
Unavailable: 3

By Genre:
  Programming: 6
  Fiction: 3
  Science: 1

By Decade:
  2000s: 2
  2010s: 5
  2020s: 3

Oldest: "Structure and Interpretation of Computer Programs" (1984)
Newest: "The Pragmatic Programmer" (2019)
```

---

### 8. Sort Books

Sort books by:
- Title (alphabetical)
- Year (newest first)
- Author (alphabetical)

**Requirements:**
- Use `sort()` with a non-mutating pattern (`[...books].sort(...)`)
- Return sorted array, don't mutate original

---

## Requirements

### Code Organization

Split your code into separate modules:

| File | Purpose |
|------|---------|
| `books.js` | Book data and CRUD functions |
| `display.js` | Console output formatting |
| `search.js` | Search functionality |
| `statistics.js` | Statistics calculations |
| `input.js` | User input handling |
| `app.js` | Main application loop |

### ES6+ Features to Use

- [ ] `const` and `let` (no `var`)
- [ ] Arrow functions
- [ ] Template literals
- [ ] Destructuring
- [ ] Spread operator for immutable updates
- [ ] `map()`, `filter()`, `reduce()`
- [ ] `Object.entries()` for iteration
- [ ] Classes (optional but encouraged)
- [ ] Modules (`import`/`export`)

### Immutability

- Never modify the original books array directly
- Use spread operator or `filter()` for additions/removals
- Use spread operator for updates

---

## User Interface

The application should show a menu and loop until the user exits:

```
=== Library Manager ===

1. Add a Book
2. List All Books
3. Find a Book
4. Update a Book
5. Delete a Book
6. Toggle Availability
7. View Statistics
8. Sort Books
0. Exit

Choose an option:
```

---

## Sample Data

Include at least 5 sample books for testing:

```js
const sampleBooks = [
  { id: 1, title: "JavaScript: The Good Parts", author: "Douglas Crockford", year: 2008, genre: "Programming", available: true },
  { id: 2, title: "Eloquent JavaScript", author: "Marijn Haverbeke", year: 2018, genre: "Programming", available: true },
  { id: 3, title: "The Pragmatic Programmer", author: "David Thomas", year: 2019, genre: "Programming", available: false },
  { id: 4, title: "1984", author: "George Orwell", year: 1949, genre: "Fiction", available: true },
  { id: 5, title: "A Brief History of Time", author: "Stephen Hawking", year: 1988, genre: "Science", available: true }
];
```

---

## Project Structure

```
library-manager/
├── books.js        # Book data and CRUD operations
├── display.js      # Console formatting functions
├── search.js       # Search functionality
├── statistics.js   # Statistics calculations
├── input.js        # User input utilities
├── app.js          # Main entry point
└── README.md       # How to run the project
```

---

## How to Run

1. Create the project folder
2. Add `"type": "module"` to `package.json`
3. Create each file with the appropriate code
4. Run: `node app.js`

---

## Bonus Features

1. **Export/Import:** Save the library to a JSON file and load it on startup
2. **Pagination:** Paginate the book list for large collections
3. **Advanced Search:** Search by year range
4. **Batch Operations:** Delete multiple books at once
5. **Color Output:** Use ANSI color codes for terminal output

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| All CRUD operations work correctly | 30% |
| ES6+ syntax used throughout | 20% |
| Code is organized into modules | 15% |
| Immutability principles followed | 15% |
| Statistics feature works | 10% |
| Search works with partial matching | 10% |

---

## Tips

1. **Start simple:** Get the menu and basic add/list working first
2. **Test incrementally:** Add one feature at a time and test it
3. **Use functions:** Break complex operations into small functions
4. **Handle edge cases:** Empty library, invalid input, duplicate IDs
5. **Console.log while developing:** Debug by logging intermediate values
