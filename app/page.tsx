import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-6">
        Welcome to Ethereum Privacy Mixer
      </h1>
      <p className="text-xl mb-4">
        Enhance your Ethereum and ERC20 token transaction privacy with our
        state-of-the-art mixing service.
      </p>
      <p className="text-lg mb-8">
        Secure, anonymous, and supporting multiple tokens on the Ethereum
        network.
      </p>
      <div className="flex justify-center space-x-4">
        <Link href="/deposit">
          <Button className="bg-purple-600 hover:bg-purple-700">
            Start Mixing <ArrowRight className="ml-2" />
          </Button>
        </Link>
        <Link href="/compliance">
          <Button variant="outline">Learn More</Button>
        </Link>
      </div>
    </div>
  );
}
