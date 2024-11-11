import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
export default function Start() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-primary p-6 text-primary-foreground">
      <div className="mt-auto flex flex-row items-center">
        <img
          src="/assets/logo.png"
          alt="logo"
          className="h-32 w-32 object-cover"
        />
        <p className="-ml-6 mt-8 flex flex-col leading-none">
          <motion.span>By your side</motion.span>
          <motion.span>Every ride</motion.span>
        </p>
      </div>
      <Button size={"lg"} className="mt-auto w-full" variant={"secondary"}>
        <Link to="/login">Let&apos;s get started</Link>
      </Button>
    </div>
  );
}
