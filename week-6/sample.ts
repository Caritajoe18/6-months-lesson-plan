// Each member has a shared "kind" field
interface Success {
  kind: "success";
  data: string[];
}

interface Failure {
  kind: "failure";
  error: string;
}

type APIResult = Success | Failure;

function handle(result: APIResult) {
  switch (result.kind) {
    case "success":
      console.log(result.kind);      // safe: data exists only here
      break;
    case "failure":
      console.error(result.error);   // safe: error exists only here
      break;
  }
}

function add(a: number, b: number): number {
  return a + b;
}


function sum(...nums: number[]): number {
  return nums.reduce((total, n) => total + n, 0);
}



// Higher-order function with typed callback
function processItems(items: number[], callback: (item: number) => number): number[] {
  return items.map(callback);
}


const doubled = processItems([1, 2, 3], (n) => n * 2);
console.log(doubled); // [2, 4, 6]

type User = { id: number; name: string; role: "admin" | "user" };

const users: any = [
  { id: 1, role: "admin" },
  { id: 2, name: "Grace", role: "user" }
];

// Callback params are inferred.
const admin = users.find((u: any) => u.role === "admin");
// admin: User | undefined — guard it!






interface PaymentMethod {
  pay(amount: number): boolean;
}

class CreditCard implements PaymentMethod {
  pay(amount: number): boolean {
    console.log(`Charging $${amount} to card`);
    return true;
  }
}

class Paypal implements PaymentMethod {
  pay(amount: number): boolean {
    console.log(`Charging $${amount} via PayPal`);
    return true;
  }
}









abstract class Shape {
  constructor(public color: string) {}

  abstract area(): number;   // must be implemented by subclass

  describe(): string {   
    console.log(`${this.color} shape, area is ${this.area()}`)    
    return `${this.color} shape, area is ${this.area()}`;
  }
}

class Circle extends Shape {
  constructor(color: string, public radius: number) {
    super(color);
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

const c = new Circle("red", 3);
console.log(c.describe()); // red shape, area is 28.27...


function makeUser(num : number) {
  return { id: 1, name: "Ada", email: "a@b.c" };
}

type Users = ReturnType<typeof makeUser>; 


// {id: number; name: string; email: string}


type EventName = `book..${string}`;

function logEvent(name: EventName) { }

logEvent("book..login");    // ✅
logEvent("book..logout");   // ✅
logEvent("book..created"); // must start with "user."


type UserId = string & { __brand: "UserId" };
type OrderId = number & { __brand: "OrderId" };

const userId = "u-1" as UserId;
const orderId = 2 as OrderId;

function byUserId(id: UserId) {}

function byOrderId(id: OrderId){}

byUserId(userId);        // ✅


byOrderId(orderId);       // ❌ OrderId is not assignable to UserId