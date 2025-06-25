import { LinkButton } from "@/components/ui/link-button";
import { Car } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ShareLyft</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <p className="text-gray-500 mb-8 max-w-lg">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex space-x-4">
          <LinkButton href="/" className="bg-green-600 hover:bg-green-700 text-white">
            Go back home
          </LinkButton>
        </div>
      </div>

      <footer className="bg-white py-4 border-t">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; 2024 ShareLyft. All rights reserved.
        </div>
      </footer>
    </div>
  );
}