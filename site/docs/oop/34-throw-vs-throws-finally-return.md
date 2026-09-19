---
id: 34-throw-vs-throws-finally-return
title: "throw vs throws, does finally run if try has a return"
description: "Navigate complex exception handling flows, including the behavior of finally blocks during early returns."

sidebar_position: 34
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** 33. 	hrow vs 	hrows, does inally run if 	ry has a 
eturn

### ELI5: The Warning Label vs. The Action
	hrows is the warning label on a box. It sits on the outside (the method signature) and tells whoever picks it up, "Hey, this might contain a broken glass exception. If you open it, you need to wear gloves (handle the exception)."

	hrow is the actual act of throwing the broken glass at someone. It happens inside the box (the method body) when something actually goes wrong.

As for 	ry, 
eturn, and inally: Imagine you are at a restaurant. The 	ry block says, "I'm leaving right now!" (the 
eturn statement). But the inally block is the bouncer at the door. He says, "You can leave, but you have to pay your tab first." The bouncer always makes you stop and do the inally action before you actually get to step outside.

### The Proper Answer: Two Separate Concepts
This is actually a two-part interview question targeting syntax knowledge and execution flow.

### Part 1: throw vs. throws (in Java/C#)
| Feature | 	hrow | 	hrows |
| :--- | :--- | :--- |
| **Purpose** | Used to explicitly trigger an exception. | Used to declare that a method might trigger an exception. |
| **Location** | Used inside the method body. | Used outside in the method signature. |
| **Quantity** | Can only throw one exception instance at a time. | Can declare multiple exceptions (comma-separated). |
| **Analogy** | The action of causing the error. | The contract warning the caller to handle the error. |

### Part 2: Does finally run if try has a return?
Yes. The inally block always executes, even if there is a 
eturn statement in the 	ry (or catch) block.

When the JVM hits a 
eturn inside a 	ry block, it evaluates the return value, holds onto it in a temporary memory slot, pauses the return process, and jumps down to execute the inally block. Only after the inally block completes does it actually hand that held value back to the caller.

⚠️ **The Interview Trap: When finally overrides return**

Interviewers love to follow up with a trick question: What happens if the inally block ALSO has a 
eturn statement?

If both the 	ry block and the inally block have a 
eturn statement, the inally block wins. It will silently override the value that the 	ry block tried to return. (This is considered bad practice in enterprise code because it swallows the original intent or exception, but it is a classic interview gotcha).

Note: The only times a inally block will not execute are if the JVM forcibly crashes (e.g., System.exit(0) is called), the thread is killed, or there is a physical power failure.

### Interview Summary
To knock this out of the park, structure your answer into these three punchy bullet points:
1.  **The Syntax Difference:** 	hrow is an execution statement used inside a method to trigger an exception object; 	hrows is a declaration in the method signature to warn callers they must handle potential exceptions.
2.  **The Execution Flow:** The inally block is guaranteed to run. If a 	ry block hits a 
eturn, it evaluates the expression, suspends the return process to execute the inally block, and then completes the return.
3.  **The Edge Case (Bonus Points):** Mention that you must be careful not to put a 
eturn in a inally block, because it will override any returned value or swallowed exception from the 	ry block.

---

### Crucial Nuance: The Ghost Exception Trap

Another disastrous consequence of putting a `return` statement inside a `finally` block is that it will completely swallow unhandled exceptions. If the `try` block throws a fatal exception, the runtime pauses the exception propagation to execute the `finally` block. If it hits a `return` statement there, the exception is discarded entirely, and the application silently continues as if nothing went wrong, hiding critical bugs from your logs.

