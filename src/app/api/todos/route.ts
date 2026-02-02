import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

/* ---------------- TYPES ---------------- */

type TodoItem = {
  id: number;
  userId: string;
  task: string;
  category?: string;
  completed: boolean;
  priority?: string;
  dueDate?: string;
  notes?: string;
  createdAt: number;
};

interface UserDocument {
  userId: string;
  todos: TodoItem[];
}

/* ---------------- MONGO SETUP ---------------- */

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI IS NOT DEFINED");
}

const uri = process.env.MONGODB_URI as string;

const client = new MongoClient(uri);
const dbName = "todo-nextjs-app";
const collectionName = "users";

/* ---------------- POST ---------------- */

export async function POST(request: Request) {
  const { userId, task, category, completed, priority, dueDate, notes } =
    await request.json();

  if (!userId || !task) {
    return NextResponse.json(
      { error: "User ID and task are required" },
      { status: 400 }
    );
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection<UserDocument>(collectionName);

    const newTodo: TodoItem = {
      id: Date.now(),
      userId,
      task,
      category,
      completed: Boolean(completed),
      priority: priority || "medium",
      dueDate: dueDate || "",
      notes: notes || "",
      createdAt: Date.now(),
    };

    const updateResult = await usersCollection.updateOne(
      { userId },
      { $push: { todos: newTodo } },
      { upsert: true }
    );

    return NextResponse.json(
      { message: "Todo added successfully", result: updateResult },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding todo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ---------------- GET ---------------- */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection<UserDocument>(collectionName);

    const user = await usersCollection.findOne({ userId });

    return NextResponse.json(user?.todos || [], { status: 200 });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ---------------- PATCH ---------------- */

export async function PATCH(request: Request) {
  const { userId, todoId, completed } = await request.json();

  if (!userId || !todoId) {
    return NextResponse.json(
      { error: "User ID and Todo ID are required" },
      { status: 400 }
    );
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection<UserDocument>(collectionName);

    const normalizedTodoId =
      typeof todoId === "string" ? parseInt(todoId, 10) : todoId;

    await usersCollection.updateOne(
      { userId, "todos.id": normalizedTodoId },
      { $set: { "todos.$.completed": completed } }
    );

    return NextResponse.json({ message: "Todo updated" });
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ---------------- PUT ---------------- */

export async function PUT(request: Request) {
  const body = await request.json();

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection<UserDocument>(collectionName);

    const todoId =
      typeof body.todoId === "string"
        ? parseInt(body.todoId, 10)
        : body.todoId;

    await usersCollection.updateOne(
      { userId: body.userId, "todos.id": todoId },
      {
        $set: {
          "todos.$.task": body.task,
          "todos.$.category": body.category,
          "todos.$.priority": body.priority,
          "todos.$.dueDate": body.dueDate,
          "todos.$.notes": body.notes,
          "todos.$.completed": body.completed,
        },
      }
    );

    return NextResponse.json({ message: "Todo updated" });
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ---------------- DELETE ---------------- */

export async function DELETE(request: Request) {
  const { userId, todoId } = await request.json();

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection<UserDocument>(collectionName);

    const normalizedTodoId =
      typeof todoId === "string" ? parseInt(todoId, 10) : todoId;

    await usersCollection.updateOne(
      { userId },
      { $pull: { todos: { id: normalizedTodoId } } }
    );

    return NextResponse.json({ message: "Todo deleted" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
