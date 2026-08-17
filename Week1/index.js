function add(a, b) {

    return a + b;

}


function subtract(a, b) {

    if (typeof a !== "number" || typeof b !== "number") {
        return "Error: Both arguments must be numbers.";
    }

    return a - b;

}


function multiply(a, b) {

    return a * b;

}


function divides(a, b) {

    return a / b;

}

const divide = (a, b)=>{

}



// console.log("Addition:", add(20, 10));

 //console.log("Subtraction:", subtract(3, 10));

// console.log("Multiplication:", multiply(20, 10));

// console.log("Division:", divide(20, 10));




const name = "ada, yes";


const life = 'Iamliving';

const fruits = ["Banana", "Orange", "Apple", "Mango"];
let fruit = fruits.shift();

// console.log("fruit", fruit)
// console.log ("updated fruit", fruits)

const cars = ['BMW', 'Volvo', 'Mini'];

// Iterate over the Array values
let text = "";
for (let x in cars) {
   text += cars[x] + "b";
}

console.log("text", text)



  // does not include the end



// const work2 = `${life} ${name}` // template literals


// const work = "ada, yes" + ' I am living' // template literals


// console.log("my work:", work )

