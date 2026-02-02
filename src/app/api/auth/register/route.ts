import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

interface User {
  username: string;
  password: string;
}

const uri = process.env.MONGODB_URI as string;

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// Function to connect to MongoDB
async function connectToDatabase() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db("todo-nextjs-app");
}

export async function POST(request: Request) {
  const { username, password }: User = await request.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection("users");

    const existingUser = await usersCollection.findOne({ username });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    await usersCollection.insertOne({ username, password });

    return NextResponse.json(
      { message: "User registered successfully", user: { username } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during user registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
