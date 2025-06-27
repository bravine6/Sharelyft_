// DEPRECATED: This component has been replaced by the new chat-based contact sharing system
// 
// The old service fee payment system has been replaced with:
// - Automatic conversation creation when ride requests are accepted
// - Drivers don't pay (they already paid for ride posting)  
// - Only passengers pay KES 50 for contact sharing via the chat system
// - Contact sharing happens through the chat interface
//
// New flow:
// 1. Driver accepts ride request
// 2. Chat conversation is automatically created
// 3. Both parties can start chatting immediately
// 4. Passenger pays KES 50 through chat interface to unlock contact information
// 5. Driver contact sharing is included (no additional payment required)
//
// This file is kept for reference but should not be used in new implementations.

export default function ServiceFeePayment() {
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-yellow-800 font-medium">Component Deprecated</p>
      <p className="text-yellow-700 text-sm mt-1">
        This payment system has been replaced with the new chat-based contact sharing.
        Please use the chat system instead.
      </p>
    </div>
  );
}