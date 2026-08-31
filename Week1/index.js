import readline from "readline";

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


export const ask = (question) => {
  return new Promise((resolve) => {
    input.question(question, (answer) => {
      resolve(answer);
    });
  });
};


export const closeInput = () => {
  input.close();
};