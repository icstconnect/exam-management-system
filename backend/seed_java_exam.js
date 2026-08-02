const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/exam_db'
});

const examData = {
  title: 'Java Question Set - Theoretical & Practical Mechanics',
  duration_minutes: 60,
  target_batch: 'CJE (Java)',
  full_marks: 100,
  status: 'CREATED',
  sections: [
    {
      title: 'Section 1: Theoretical Concepts',
      section_marks: 10,
      section_type: 'MCQ',
      questions: [
        {
          text: `Where are local primitive variables and object references stored during method execution in the Java Virtual Machine (JVM)?`,
          options: ["A) Heap Memory", "B) Stack Memory", "C) Method Area / Metaspace", "D) Garbage Collector Buffer"],
          correct: "B) Stack Memory"
        },
        {
          text: `Which feature introduced in modern Java provides a compact syntax to create immutable data-carrier classes without boilerplate code?`,
          options: ["A) Abstract Classes", "B) Sealed Classes", "C) Java Records", "D) Interface Defaults"],
          correct: "C) Java Records"
        },
        {
          text: `What happens during method overriding if the child class method has a narrower access modifier than the superclass method?`,
          options: ["A) It compiles successfully with runtime polymorphism.", "B) It causes a compile-time error due to reducing visibility.", "C) The JVM automatically upgrades the visibility at runtime.", "D) It creates a overloaded method instead."],
          correct: "B) It causes a compile-time error due to reducing visibility."
        },
        {
          text: `Which SOLID design principle states that software entities (classes, modules) should be open for extension but closed for modification?`,
          options: ["A) Single Responsibility Principle", "B) Open/Closed Principle", "C) Liskov Substitution Principle", "D) Dependency Inversion Principle"],
          correct: "B) Open/Closed Principle"
        },
        {
          text: `Which class is the superclass of all Exception and Error classes in Java?`,
          options: ["A) java.lang.RuntimeException", "B) java.lang.Throwable", "C) java.lang.Exception", "D) java.lang.Object"],
          correct: "B) java.lang.Throwable"
        }
      ]
    },
    {
      title: 'Section 2: Error Finding',
      section_marks: 20,
      section_type: 'MCQ',
      questions: [
        {
          text: `Identify the compilation error in the following code:\n\n\`\`\`java\npublic class Student {\n    final int id;\n    \n    public Student(int id) {\n        this.id = id;\n    }\n    \n    public void updateId(int newId) {\n        this.id = newId; \n    }\n}\n\`\`\``,
          options: ["A) Line 3: Final variables cannot be assigned in a constructor.", "B) Line 7: Cannot assign a value to a final variable outside initialization or constructor.", "C) Line 1: Class must be marked final.", "D) Line 6: Method must return int."],
          correct: "B) Line 7: Cannot assign a value to a final variable outside initialization or constructor."
        },
        {
          text: `What is wrong with this interface declaration?\n\n\`\`\`java\npublic interface Payment {\n    private double amount = 100.0;\n    void process();\n}\n\`\`\``,
          options: ["A) Interfaces cannot contain variables.", "B) Interface variables are implicitly public static final, so private is not allowed.", "C) process() must have a body.", "D) Interfaces cannot be public."],
          correct: "B) Interface variables are implicitly public static final, so private is not allowed."
        },
        {
          text: `Identify the error in this overriding example:\n\n\`\`\`java\nclass Parent {\n    public static void display() {\n        System.out.println("Parent");\n    }\n}\n\nclass Child extends Parent {\n    @Override\n    public static void display() {\n        System.out.println("Child");\n    }\n}\n\`\`\``,
          options: ["A) @Override annotation cannot be applied to static methods because static methods are hidden, not overridden.", "B) Static methods cannot be inherited.", "C) Child class must be marked static.", "D) Parent class requires a non-static constructor."],
          correct: "A) @Override annotation cannot be applied to static methods because static methods are hidden, not overridden."
        },
        {
          text: `Why does the following code fail to compile?\n\n\`\`\`java\nabstract class Vehicle {\n    abstract void start();\n}\n\npublic class Test {\n    public static void main(String[] args) {\n        Vehicle v = new Vehicle();\n        v.start();\n    }\n}\n\`\`\``,
          options: ["A) Abstract classes must contain at least one non-abstract method.", "B) Vehicle cannot be instantiated directly using new.", "C) start() method must be public.", "D) Test class must extend Vehicle."],
          correct: "B) Vehicle cannot be instantiated directly using new."
        },
        {
          text: `Identify the compilation flaw in this exception handling block:\n\n\`\`\`java\ntry {\n    int res = 10 / 0;\n} catch (Exception e) {\n    System.out.println("General Exception");\n} catch (ArithmeticException e) {\n    System.out.println("Arithmetic Exception");\n}\n\`\`\``,
          options: ["A) Division by zero is a compile error, not runtime.", "B) ArithmeticException has already been caught by the broader Exception block.", "C) try block must contain a finally block.", "D) Exceptions cannot be printed to System.out."],
          correct: "B) ArithmeticException has already been caught by the broader Exception block."
        },
        {
          text: `What is wrong with this Java Record definition?\n\n\`\`\`java\npublic record User(String username, int age) {\n    public User {\n        this.username = username.toUpperCase();\n    }\n}\n\`\`\``,
          options: ["A) Compact constructors in Records cannot assign fields directly using this.field.", "B) Records cannot have canonical constructors.", "C) Field types in Records must be primitive.", "D) Record parameters must be marked final."],
          correct: "A) Compact constructors in Records cannot assign fields directly using this.field."
        },
        {
          text: `Find the compilation issue with multiple interface inheritance:\n\n\`\`\`java\ninterface A {\n    default void log() { System.out.println("A"); }\n}\n\ninterface B {\n    default void log() { System.out.println("B"); }\n}\n\nclass C implements A, B {}\n\`\`\``,
          options: ["A) Interfaces cannot have default methods.", "B) Class C causes a diamond problem conflict and must explicitly override log().", "C) Class C must be declared abstract.", "D) Default methods cannot print output."],
          correct: "B) Class C causes a diamond problem conflict and must explicitly override log()."
        },
        {
          text: `Why will the following Generic array instantiation fail at compile time?\n\n\`\`\`java\npublic class GenericStorage<T> {\n    private T[] items;\n    \n    public GenericStorage(int capacity) {\n        items = new T[capacity];\n    }\n}\n\`\`\``,
          options: ["A) capacity must be final.", "B) Generic arrays cannot be directly instantiated due to type erasure.", "C) T must extend Object explicitly using T extends Object.", "D) Array fields cannot be marked private in generic classes."],
          correct: "B) Generic arrays cannot be directly instantiated due to type erasure."
        },
        {
          text: `Identify the error in this Java Sealed Class hierarchy:\n\n\`\`\`java\npublic sealed class Shape permits Circle, Square {}\npublic class Circle extends Shape {}\npublic final class Square extends Shape {}\n\`\`\``,
          options: ["A) Shape must be an interface, not a class.", "B) Permitted subclass Circle must be declared as final, sealed, or non-sealed.", "C) Square must implement Comparable.", "D) permits clause must come before the class name."],
          correct: "B) Permitted subclass Circle must be declared as final, sealed, or non-sealed."
        },
        {
          text: `What causes a compilation failure in the following inheritance hierarchy?\n\n\`\`\`java\nclass Base {\n    int value;\n    Base(int v) { this.value = v; }\n}\n\nclass Derived extends Base {\n    int count;\n    Derived(int v, int c) {\n        this.count = c;\n        super(v);\n    }\n}\n\`\`\``,
          options: ["A) super() call must be the very first statement inside the constructor.", "B) Base class lacks a default no-argument constructor.", "C) Constructor parameters cannot match field names.", "D) Both A and B."],
          correct: "D) Both A and B."
        }
      ]
    },
    {
      title: 'Section 3: Predict the Output',
      section_marks: 14,
      section_type: 'MCQ',
      questions: [
        {
          text: `What is the output of the following code snippet?\n\n\`\`\`java\nString s1 = "Java";\ns1.concat(" World");\nSystem.out.println(s1);\n\`\`\``,
          options: ["A) Java World", "B) Java", "C) World", "D) NullPointerException"],
          correct: "B) Java"
        },
        {
          text: `Analyze the following code and select the printed output:\n\n\`\`\`java\nclass Parent {\n    int num = 10;\n    void print() { System.out.println("Parent: " + num); }\n}\n\nclass Child extends Parent {\n    int num = 20;\n    void print() { System.out.println("Child: " + num); }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Parent obj = new Child();\n        System.out.print(obj.num + " ");\n        obj.print();\n    }\n}\n\`\`\``,
          options: ["A) 20 Child: 20", "B) 10 Parent: 10", "C) 10 Child: 20", "D) 20 Parent: 10"],
          correct: "C) 10 Child: 20"
        },
        {
          text: `What will be printed when this array loop runs?\n\n\`\`\`java\nint[] arr = {10, 20, 30, 40};\nint i = 0;\narr[i] = arr[++i] + arr[i++];\nSystem.out.println(arr[0] + ", " + arr[1] + ", " + i);\n\`\`\``,
          options: ["A) 50, 20, 2", "B) 40, 20, 2", "C) 10, 50, 2", "D) 50, 30, 2"],
          correct: "A) 50, 20, 2"
        },
        {
          text: `What is the return value of test()?\n\n\`\`\`java\npublic static int test() {\n    try {\n        return 10;\n    } finally {\n        return 20;\n    }\n}\n\`\`\``,
          options: ["A) 10", "B) 20", "C) Compilation Error", "D) 0"],
          correct: "B) 20"
        },
        {
          text: `What does the following matrix processing code output?\n\n\`\`\`java\nint[][] matrix = {{1, 2}, {3, 4, 5}};\nint sum = 0;\nfor(int r = 0; r < matrix.length; r++) {\n    sum += matrix[r][0];\n}\nSystem.out.println(sum);\n\`\`\``,
          options: ["A) 3", "B) 4", "C) 15", "D) 10"],
          correct: "B) 4"
        },
        {
          text: `Predict the outcome of object pass-by-value reference modification:\n\n\`\`\`java\nclass Data { int val = 5; }\n\npublic class Test {\n    static void modify(Data d) {\n        d.val = 10;\n        d = new Data();\n        d.val = 20;\n    }\n    public static void main(String[] args) {\n        Data x = new Data();\n        modify(x);\n        System.out.println(x.val);\n    }\n}\n\`\`\``,
          options: ["A) 5", "B) 10", "C) 20", "D) 0"],
          correct: "B) 10"
        },
        {
          text: `In what sequence are blocks executed when creating an instance?\n\n\`\`\`java\nclass Demo {\n    static { System.out.print("S "); }\n    { System.out.print("I "); }\n    Demo() { System.out.print("C "); }\n    public static void main(String[] args) {\n        new Demo();\n        new Demo();\n    }\n}\n\`\`\``,
          options: ["A) S I C I C", "B) S I C S I C", "C) I C S I C", "D) S C I C I"],
          correct: "A) S I C I C"
        }
      ]
    },
    {
      title: 'Section 4: Practical OOP & Applied Java Mechanics',
      section_marks: 56,
      section_type: 'MCQ',
      questions: [
        {
          text: `Which array declaration successfully initializes a 2D ragged array with 3 rows in Java?`,
          options: ["A) int[][] arr = new int[][3];", "B) int[][] arr = new int[3][];", "C) int[][] arr = new int[];", "D) int[][] arr = new int[empty][3];"],
          correct: "B) int[][] arr = new int[3][];"
        },
        {
          text: `Consider the following inheritance hierarchy. What statement must be placed at // Line 1 to call the parent class constructor?\n\n\`\`\`java\nclass SuperClass {\n    SuperClass(int x) {}\n}\nclass SubClass extends SuperClass {\n    SubClass(int x) {\n        // Line 1\n    }\n}\n\`\`\``,
          options: ["A) this(x);", "B) super(x);", "C) parent(x);", "D) SuperClass(x);"],
          correct: "B) super(x);"
        },
        {
          text: `What code snippet correctly converts a String "1234" to a primitive int?\n\n\`\`\`java\nString str = "1234";\n// Convert str to int num\n\`\`\``,
          options: ["A) int num = (int) str;", "B) int num = Integer.parseInt(str);", "C) int num = String.valueOf(str);", "D) int num = Integer.toString(str);"],
          correct: "B) int num = Integer.parseInt(str);"
        },
        {
          text: `Given the following encapsulation task, which statement accurately evaluates the immutability of BankAccount?\n\n\`\`\`java\npublic final class BankAccount {\n    private final List<String> transactions;\n    \n    public BankAccount(List<String> txs) {\n        this.transactions = new ArrayList<>(txs);\n    }\n    \n    public List<String> getTransactions() {\n        return Collections.unmodifiableList(transactions);\n    }\n}\n\`\`\``,
          options: ["A) The class is mutable because List can be appended to.", "B) The class is immutable because it uses defensive copying in the constructor and an unmodifiable list in the getter.", "C) Immutability is violated because BankAccount is not marked abstract.", "D) The constructor fails to assign fields correctly."],
          correct: "B) The class is immutable because it uses defensive copying in the constructor and an unmodifiable list in the getter."
        },
        {
          text: `In credit card validation (Luhn Algorithm), what is the output of the following method when digit = 8?\n\n\`\`\`java\npublic static int processDigit(int digit) {\n    int doubled = digit * 2;\n    return (doubled % 10) + (doubled / 10);\n}\n\`\`\``,
          options: ["A) 16", "B) 7", "C) 8", "D) 1"],
          correct: "B) 7"
        },
        {
          text: `What will the following recursive Euclidean algorithm implementation return for gcd(48, 18)?\n\n\`\`\`java\npublic static int gcd(int a, int b) {\n    return b == 0 ? a : gcd(b, a % b);\n}\n\`\`\``,
          options: ["A) 12", "B) 6", "C) 3", "D) 2"],
          correct: "B) 6"
        },
        {
          text: `Consider the following string iteration logic used in formula parsing. How many times will count increment?\n\n\`\`\`java\nString formula = "H2SO4";\nint count = 0;\nfor (char ch : formula.toCharArray()) {\n    if (Character.isDigit(ch)) {\n        count++;\n    }\n}\n\`\`\``,
          options: ["A) 1", "B) 2", "C) 3", "D) 5"],
          correct: "B) 2"
        },
        {
          text: `Which method correctly determines if a Knight move on an 8x8 chessboard from (r1, c1) to (r2, c2) is valid?\n\n\`\`\`java\npublic static boolean isValidKnightMove(int r1, int c1, int r2, int c2) {\n    int dRow = Math.abs(r1 - r2);\n    int dCol = Math.abs(c1 - c2);\n    // Line 4: Return condition\n}\n\`\`\``,
          options: ["A) return dRow == dCol;", "B) return (dRow == 2 && dCol == 1) || (dRow == 1 && dCol == 2);", "C) return dRow == 0 || dCol == 0;", "D) return dRow + dCol == 2;"],
          correct: "B) return (dRow == 2 && dCol == 1) || (dRow == 1 && dCol == 2);"
        },
        {
          text: `What will be the output of the following character uniqueness check?\n\n\`\`\`java\nString s = "ALGORITHM";\nboolean isUnique = s.length() == s.chars().distinct().count();\nSystem.out.println(isUnique);\n\`\`\``,
          options: ["A) true", "B) false", "C) Compilation Error", "D) Runtime Exception"],
          correct: "A) true"
        },
        {
          text: `What will happen when executing pop() on this custom Stack implementation?\n\n\`\`\`java\npublic class ArrayStack {\n    private int[] data = new int[5];\n    private int top = -1;\n    \n    public int pop() {\n        if (top == -1) {\n            throw new EmptyStackException();\n        }\n        return data[top--];\n    }\n    public static void main(String[] args) {\n        new ArrayStack().pop();\n    }\n}\n\`\`\``,
          options: ["A) Returns 0", "B) Throws EmptyStackException", "C) Throws ArrayIndexOutOfBoundsException", "D) Throws NullPointerException"],
          correct: "B) Throws EmptyStackException"
        },
        {
          text: `What will be the result of attempting to compile and execute the following serialization code?\n\n\`\`\`java\nclass Account implements Serializable {\n    String username = "Admin";\n    transient String password = "SecretPassword";\n}\n// After serializing and deserializing an Account object instance 'acc'\n\`\`\``,
          options: ["A) acc.password is \"SecretPassword\"", "B) acc.password is null", "C) Throws NotSerializableException", "D) Compilation fails on transient keyword"],
          correct: "B) acc.password is null"
        },
        {
          text: `Which generic method invocation causes a compile-time error?\n\n\`\`\`java\npublic class WildcardDemo {\n    public static void processList(List<? extends Number> list) {}\n    \n    public static void main(String[] args) {\n        List<Integer> l1 = new ArrayList<>();\n        List<Double> l2 = new ArrayList<>();\n        List<Object> l3 = new ArrayList<>();\n        \n        processList(l1); // Line A\n        processList(l2); // Line B\n        processList(l3); // Line C\n    }\n}\n\`\`\``,
          options: ["A) Line A", "B) Line B", "C) Line C", "D) None of the lines cause an error"],
          correct: "C) Line C"
        },
        {
          text: `Which interface correctly defines a valid Functional Interface?\n\n\`\`\`java\n// Definition A\n@FunctionalInterface\ninterface MathOperation {\n    int compute(int a, int b);\n}\n\`\`\``,
          options: ["A) MathOperation is a valid Functional Interface because it contains exactly one abstract method.", "B) It is invalid because @FunctionalInterface requires at least two methods.", "C) Functional interfaces cannot accept arguments.", "D) Functional interfaces must be marked abstract classes."],
          correct: "A) MathOperation is a valid Functional Interface because it contains exactly one abstract method."
        },
        {
          text: `What is the output of the following Run-Length Encoding decoder code snippet?\n\n\`\`\`java\nStringBuilder sb = new StringBuilder();\nString input = "A3B2";\nfor (int i = 0; i < input.length(); i += 2) {\n    char ch = input.charAt(i);\n    int count = Character.getNumericValue(input.charAt(i + 1));\n    sb.append(String.valueOf(ch).repeat(count));\n}\nSystem.out.println(sb.toString());\n\`\`\``,
          options: ["A) A3B2", "B) AAABB", "C) ABABAB", "D) AAAAABBB"],
          correct: "B) AAABB"
        },
        {
          text: `What is the expected behavior of the following custom exception class?\n\n\`\`\`java\nclass InvalidTransactionException extends Exception {\n    public InvalidTransactionException(String message) {\n        super(message);\n    }\n}\n\`\`\``,
          options: ["A) It creates an Unchecked Exception.", "B) It creates a Checked Exception that must be declared or caught.", "C) It causes a compilation error because Exception cannot be extended.", "D) It causes a runtime memory leak."],
          correct: "B) It creates a Checked Exception that must be declared or caught."
        },
        {
          text: `Consider matrix convolution using a 3x3 kernel on pixel (r, c). What is the total number of matrix elements accessed in the inner loops?\n\n\`\`\`java\nint sum = 0;\nfor (int dr = -1; dr <= 1; dr++) {\n    for (int dc = -1; dc <= 1; dc++) {\n        sum += image[r + dr][c + dc] * kernel[dr + 1][dc + 1];\n    }\n}\n\`\`\``,
          options: ["A) 4", "B) 9", "C) 3", "D) 16"],
          correct: "B) 9"
        },
        {
          text: `What is the output of the following varargs method?\n\n\`\`\`java\npublic class VarargsTest {\n    static int sum(int... numbers) {\n        int total = 0;\n        for (int n : numbers) total += n;\n        return total;\n    }\n    public static void main(String[] args) {\n        System.out.println(sum(1, 2, 3, 4));\n    }\n}\n\`\`\``,
          options: ["A) 10", "B) 4", "C) 0", "D) Compilation Error"],
          correct: "A) 10"
        },
        {
          text: `What does the following Saddle Point algorithm snippet check for matrix[i][j]?\n\n\`\`\`java\nboolean isSaddle = true;\nfor (int k = 0; k < cols; k++) {\n    if (matrix[i][k] < matrix[i][j]) isSaddle = false;\n}\nfor (int k = 0; k < rows; k++) {\n    if (matrix[k][j] > matrix[i][j]) isSaddle = false;\n}\n\`\`\``,
          options: ["A) Checks if matrix[i][j] is maximum in row i and minimum in column j.", "B) Checks if matrix[i][j] is minimum in row i and maximum in column j.", "C) Checks if matrix[i][j] is the average of row i.", "D) Checks if matrix[i][j] is the largest element in the whole matrix."],
          correct: "B) Checks if matrix[i][j] is minimum in row i and maximum in column j."
        },
        {
          text: `What happens when System.gc() is called in the following code?\n\n\`\`\`java\npublic class GCTest {\n    public static void main(String[] args) {\n        Object obj = new Object();\n        obj = null;\n        System.gc();\n    }\n}\n\`\`\``,
          options: ["A) Memory is guaranteed to be freed immediately before the next instruction.", "B) The JVM is requested to execute Garbage Collection, but execution timing is nondeterministic.", "C) Program execution halts permanently.", "D) Throws NullPointerException."],
          correct: "B) The JVM is requested to execute Garbage Collection, but execution timing is nondeterministic."
        },
        {
          text: `Why does the following subclass definition fail to compile?\n\n\`\`\`java\nclass SuperClass {\n    public final void performAction() {}\n}\nclass SubClass extends SuperClass {\n    @Override\n    public void performAction() {}\n}\n\`\`\``,
          options: ["A) Final methods cannot be inherited.", "B) Final methods cannot be overridden by subclasses.", "C) Subclasses must be declared final.", "D) SuperClass must be abstract."],
          correct: "B) Final methods cannot be overridden by subclasses."
        },
        {
          text: `In Conway's Game of Life, what is the result of the following conditional check on grid[r][c]?\n\n\`\`\`java\nint liveNeighbors = 3;\nboolean currentState = true; // Live cell\nboolean nextState = currentState && (liveNeighbors == 2 || liveNeighbors == 3);\n\`\`\``,
          options: ["A) nextState becomes false due to underpopulation.", "B) nextState becomes true (the live cell survives).", "C) nextState becomes false due to overpopulation.", "D) Compilation Error."],
          correct: "B) nextState becomes true (the live cell survives)."
        },
        {
          text: `What is the printed output of the bitwise shift operation?\n\n\`\`\`java\nint val = -8;\nSystem.out.println(val >>> 29);\n\`\`\``,
          options: ["A) -1", "B) 7", "C) -2", "D) 0"],
          correct: "B) 7"
        },
        {
          text: `What keyword is used to prevent an instance variable from being serialized?`,
          options: ["A) volatile", "B) transient", "C) static", "D) final"],
          correct: "B) transient"
        },
        {
          text: `How do you declare a generic class in Java?`,
          options: ["A) public class Box<T> {}", "B) public class Box(T) {}", "C) public class <T> Box {}", "D) public generic class Box {}"],
          correct: "A) public class Box<T> {}"
        },
        {
          text: `In the Shunting-Yard algorithm, what condition triggers popping operators from the stack during expression parsing?\n\n\`\`\`java\nwhile (!stack.isEmpty() && precedence(op) <= precedence(stack.peek())) {\n    output.add(stack.pop());\n}\n\`\`\``,
          options: ["A) Incoming operator has higher precedence than stack top.", "B) Stack top operator has greater than or equal precedence to incoming operator.", "C) Stack reaches maximum capacity.", "D) A closing parenthesis is encountered."],
          correct: "B) Stack top operator has greater than or equal precedence to incoming operator."
        },
        {
          text: `In recursive Maze Pathfinding, what is the function of visited[r][c] = false in this backtracking snippet?\n\n\`\`\`java\nboolean solve(int r, int c) {\n    if (r == targetR && c == targetC) return true;\n    visited[r][c] = true;\n    \n    if (solve(r + 1, c)) return true;\n    if (solve(r, c + 1)) return true;\n    \n    visited[r][c] = false; // Backtracking step\n    return false;\n}\n\`\`\``,
          options: ["A) To prevent recursion from terminating.", "B) Unmarks the cell so alternative intersecting paths can visit it if the current branch fails.", "C) Reclaims heap memory immediately.", "D) Throws an exception on failure."],
          correct: "B) Unmarks the cell so alternative intersecting paths can visit it if the current branch fails."
        },
        {
          text: `Why does the following modular exponentiation function take modulus % n at each multiplication step instead of calling Math.pow(base, exp)?\n\n\`\`\`java\npublic static long modPow(long base, long exp, long mod) {\n    long res = 1;\n    base = base % mod;\n    while (exp > 0) {\n        if (exp % 2 == 1) res = (res * base) % mod;\n        base = (base * base) % mod;\n        exp /= 2;\n    }\n    return res;\n}\n\`\`\``,
          options: ["A) Direct exponentiation (Math.pow) causes double/long arithmetic overflow on large exponents.", "B) Math.pow cannot be executed in loops.", "C) % mod cannot be performed on double values.", "D) Math.pow requires a try-catch block."],
          correct: "A) Direct exponentiation (Math.pow) causes double/long arithmetic overflow on large exponents."
        },
        {
          text: `What will be the output of executing the following multithreaded code?\n\n\`\`\`java\nclass SharedResource {\n    public synchronized void print(String name) {\n        System.out.print(name + " ");\n    }\n}\npublic class Test {\n    public static void main(String[] args) {\n        SharedResource obj1 = new SharedResource();\n        SharedResource obj2 = new SharedResource();\n        \n        new Thread(() -> obj1.print("T1")).start();\n        new Thread(() -> obj2.print("T2")).start();\n    }\n}\n\`\`\``,
          options: ["A) Always prints T1 T2 strictly in order because of synchronization.", "B) Both threads execute concurrently without blocking each other because they lock separate instances (obj1 and obj2).", "C) Deadlock occurs and nothing prints.", "D) Throws IllegalThreadStateException."],
          correct: "B) Both threads execute concurrently without blocking each other because they lock separate instances (obj1 and obj2)."
        }
      ]
    }
  ]
};

function stripDifficultyTags(input) {
  if (!input) return '';
  return input.replace(/^\s*\[[^\]]+\]\s*/gi, '');
}

function cleanMathDollars(input) {
  if (!input) return '';
  return input
    .replace(/\$\(r_1,\s*c_1\)\$/g, '(r1, c1)')
    .replace(/\$\(r_2,\s*c_2\)\$/g, '(r2, c2)')
    .replace(/\$\(r1,\s*c1\)\$/g, '(r1, c1)')
    .replace(/\$\(r2,\s*c2\)\$/g, '(r2, c2)')
    .replace(/\$\(r,\s*c\)\$/g, '(r, c)')
    .replace(/\$([+-]?\d+)\$/g, '$1')
    .replace(/\$([^\$]+)\$/g, '$1');
}

async function seedJavaExam() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove existing Java exam if re-seeding
    await client.query("DELETE FROM exams WHERE title = $1 OR target_batch = $2", [examData.title, examData.target_batch]);

    // Insert Exam
    const examRes = await client.query(
      `INSERT INTO exams (title, duration_minutes, target_batch, full_marks, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING exam_id`,
      [examData.title, examData.duration_minutes, examData.target_batch, examData.full_marks, examData.status]
    );

    const examId = examRes.rows[0].exam_id;
    console.log(`Created Exam ID: ${examId}`);

    let totalQuestionsInserted = 0;

    for (const sec of examData.sections) {
      const secRes = await client.query(
        `INSERT INTO exam_sections (exam_id, title, section_marks, section_type)
         VALUES ($1, $2, $3, $4)
         RETURNING section_id`,
        [examId, sec.title, sec.section_marks, sec.section_type]
      );
      const sectionId = secRes.rows[0].section_id;

      for (const q of sec.questions) {
        const cleanedText = stripDifficultyTags(cleanMathDollars(q.text));
        const cleanedOpts = q.options.map(opt => cleanMathDollars(opt));
        const cleanedCorrect = cleanMathDollars(q.correct);

        await client.query(
          `INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 2)`,
          [examId, sectionId, sec.section_type, cleanedText, '', JSON.stringify(cleanedOpts), cleanedCorrect]
        );
        totalQuestionsInserted++;
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully seeded Java exam with ${totalQuestionsInserted} questions!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed Java exam:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedJavaExam();
