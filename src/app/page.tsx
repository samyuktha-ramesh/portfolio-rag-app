import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-4xl font-bold mb-12 text-gray-800">
        Welcome to Portfolio Chat
      </h1>

      <div className="flex w-full max-w-lg items-center gap-2">
        <Input
          placeholder="Ask me anything..."
          className="flex-1 bg-white"
        />
        
        <Button aria-label="Send">
          <PaperAirplaneIcon className="h-5 w-5 rotate-315 text-white" />
        </Button>
      </div>
    </main>
  );
}
