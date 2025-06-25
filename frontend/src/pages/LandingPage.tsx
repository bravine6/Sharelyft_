import { LinkButton } from "@/components/ui/link-button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Car,
  Users,
  Leaf,
  DollarSign,
  Shield,
  Star,
  MessageCircle,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle,
} from "lucide-react"

export default function ShareLyftLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ShareLyft</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#how-it-works" className="text-gray-600 hover:text-green-600 transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-green-600 transition-colors">
              Pricing
            </a>
            <a href="#safety" className="text-gray-600 hover:text-green-600 transition-colors">
              Safety
            </a>
          </nav>
          <div className="flex items-center space-x-3">
            <LinkButton 
              href="/login"
              variant="outline" 
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Sign In
            </LinkButton>
            <LinkButton 
              href="/register"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Get Started
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-6 bg-green-100 text-green-800 hover:bg-green-100">Community-Centered Ride Sharing</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Share the Journey,
            <br />
            <span className="text-green-600">Split the Cost</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Connect with travelers headed your way. Pre-planned trips, transparent pricing, and a flat 50 KSh connection
            fee. No surge pricing, no hidden charges.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <LinkButton 
              href="/login"
              size="lg" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <Users className="w-5 h-5 mr-2" />
              Find a Ride
            </LinkButton>
            <LinkButton
              href="/login"
              size="lg"
              variant="outline"
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 px-8 py-3"
            >
              <Car className="w-5 h-5 mr-2" />
              Offer a Ride
            </LinkButton>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Cut Travel Costs</h3>
              <p className="text-gray-600 text-sm">Split fuel costs with fellow travelers</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Leaf className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Reduce Carbon Footprint</h3>
              <p className="text-gray-600 text-sm">Fewer cars on the road, cleaner environment</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Build Community</h3>
              <p className="text-gray-600 text-sm">Connect with like-minded travelers</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How ShareLyft Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, transparent, and designed for pre-planned journeys
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">For Passengers</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Search & Book</h4>
                    <p className="text-gray-600">Find rides for intercity commutes, campus runs, or weekend getaways</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Pay Flat Fee</h4>
                    <p className="text-gray-600">Just 50 KSh connection fee + your share of fuel costs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Travel & Rate</h4>
                    <p className="text-gray-600">Enjoy your journey and rate your experience</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">For Drivers</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Post Your Trip</h4>
                    <p className="text-gray-600">Share your planned journey and available seats</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Accept Passengers</h4>
                    <p className="text-gray-600">Review and approve ride requests from verified users</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Earn & Save</h4>
                    <p className="text-gray-600">Keep fuel contributions minus 50 KSh connection fee</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ultra-Simple Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              No surge pricing, no hidden fees, no complex commissions
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-white border-2 border-green-200">
              <CardContent className="p-0">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Flat Connection Fee</h3>
                  <div className="text-4xl font-bold text-green-600 mb-2">50 KSh</div>
                  <p className="text-gray-600">Per successful match, for both driver and passenger</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      What's Included
                    </h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        Secure ride matching
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        Real-time trip updates
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        In-app messaging
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        Payment processing
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        Two-way rating system
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Example Trip Cost</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nairobi to Nakuru (Fuel share)</span>
                          <span className="font-medium">800 KSh</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ShareLyft connection fee</span>
                          <span className="font-medium">50 KSh</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Total Cost</span>
                          <span className="text-green-600">850 KSh</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Compare to taxi: ~2,500 KSh | Bus: ~500 KSh (less comfort)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Safety & Trust */}
      <section id="safety" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Built for Trust & Safety</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced features to keep every journey secure and comfortable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Verified Profiles</h3>
                <p className="text-gray-600 text-sm">All users verified with ID and phone number</p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Two-Way Ratings</h3>
                <p className="text-gray-600 text-sm">Drivers and passengers rate each other</p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
                <p className="text-gray-600 text-sm">Secure in-app messaging for coordination</p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Secure Payments</h3>
                <p className="text-gray-600 text-sm">M-Pesa and card payments handled automatically</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Popular Routes</h2>
            <p className="text-xl text-gray-600">Join thousands of travelers on these common journeys</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { from: "Nairobi", to: "Nakuru", time: "2h 30m", price: "800" },
              { from: "Nairobi", to: "Mombasa", time: "8h", price: "1,500" },
              { from: "Nairobi", to: "Kisumu", time: "5h", price: "1,200" },
              { from: "Nairobi", to: "Eldoret", time: "4h", price: "1,000" },
              { from: "Mombasa", to: "Malindi", time: "2h", price: "600" },
              { from: "Nairobi", to: "Nyeri", time: "3h", price: "700" },
            ].map((route, index) => (
              <Card key={index} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{route.from}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-900">{route.to}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{route.time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>From</span>
                      <span className="font-semibold text-green-600">{route.price} KSh</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Share the Journey?</h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join thousands of travelers making their journeys more economical, social, and environmentally friendly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <LinkButton 
              href="/register"
              size="lg" 
              className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3"
            >
              <Users className="w-5 h-5 mr-2" />
              Find Your Ride
            </LinkButton>
            <LinkButton
              href="/register"
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-600 px-8 py-3"
            >
              <Car className="w-5 h-5 mr-2" />
              Start Driving
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">ShareLyft</span>
              </div>
              <p className="text-gray-400 text-sm">
                Community-centered ride sharing for a more connected, sustainable future.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="#safety" className="hover:text-white transition-colors">
                    Safety
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Popular Routes
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community Guidelines
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Press
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 ShareLyft. All rights reserved. Built with ❤️ for the Kenyan community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}