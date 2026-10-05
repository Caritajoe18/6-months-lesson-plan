import type { Request, Response } from "express";
import { hashPassword, verifyPassword } from "./security.ts";

interface PublicUser {
  id: number;
  email: string;
  name: string;
}

async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body;  
            
  const passwordHash: string = await hashPassword(password); 

  const user = await userStore.create({ email, name, passwordHash }); // store hash only

  const publicUser: PublicUser = {                       // strip passwordHash before sending
    id: user.id,
    email: user.email,
    name: user.name
  };
  res.status(201).json({ success: true, data: publicUser });
}