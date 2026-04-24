export type QuestionPresetCategory =
  | "cart_recovery"
  | "post_purchase"
  | "re_engagement"
  | "lead_qualification"
  | "order_support";

export type DefaultQuestionPresetTemplate = {
  name: string;
  category: QuestionPresetCategory;
  isDefault: false;
  questions: [string, string, string, string];
};

export const DEFAULT_QUESTION_PRESETS: DefaultQuestionPresetTemplate[] = [
  {
    name: "Abandoned cart — generic",
    category: "cart_recovery",
    isDefault: false,
    questions: [
      "Hi, we noticed you left a few items in your cart. Still interested?",
      "Would you like us to hold those items for you?",
      "Is there anything stopping you from completing the order — pricing, shipping, or something else?",
      "Can I help you place the order right now?",
    ],
  },
  {
    name: "Abandoned cart — specific product",
    category: "cart_recovery",
    isDefault: false,
    questions: [
      "Hi! You left [product name] in your cart. Still thinking about it?",
      "Just so you know, we have limited stock left on this item.",
      "Would a small discount help you decide today?",
      "Shall I walk you through the product details before you decide?",
    ],
  },
  {
    name: "High-value cart — urgency + discount",
    category: "cart_recovery",
    isDefault: false,
    questions: [
      "Hi, your cart has items worth [amount] — still want them?",
      "These are selling fast and we can't guarantee availability much longer.",
      "We'd like to offer you an exclusive [X]% off if you complete the order today. Interested?",
      "Shall I apply the discount and confirm your order right now?",
    ],
  },
  {
    name: "Repeat abandoner — curiosity-led",
    category: "cart_recovery",
    isDefault: false,
    questions: [
      "Hey, we've noticed you've visited us a few times — is there something specific you're looking for?",
      "Is pricing the main concern, or is it something about the product?",
      "Would you like us to suggest something that might suit you better?",
      "What would make this a no-brainer purchase for you?",
    ],
  },
  {
    name: "Product review collection",
    category: "post_purchase",
    isDefault: false,
    questions: [
      "Hi! How are you finding [product name] so far?",
      "On a scale of 1–5, how would you rate it overall?",
      "Is there anything you wish you'd known before buying it?",
      "Would you recommend it to a friend or family member?",
    ],
  },
  {
    name: "Delivery experience feedback",
    category: "post_purchase",
    isDefault: false,
    questions: [
      "Hi! Did your order arrive on time and in good condition?",
      "How would you rate the packaging — was everything secure?",
      "Was the delivery process smooth, or did you face any issues?",
      "Is there anything we can do better with shipping next time?",
    ],
  },
  {
    name: "NPS — overall brand satisfaction",
    category: "post_purchase",
    isDefault: false,
    questions: [
      "Hi! On a scale of 0–10, how likely are you to recommend us to someone you know?",
      "What's the main reason for that score?",
      "Is there one thing we could change to make your experience better?",
      "Would you shop with us again?",
    ],
  },
  {
    name: "30-day follow-up",
    category: "post_purchase",
    isDefault: false,
    questions: [
      "Hi! It's been about a month since your purchase — how's [product] holding up?",
      "Has it met your expectations so far?",
      "Have you run into any issues or have questions we can help with?",
      "Is there anything you'd like to reorder or try next?",
    ],
  },
  {
    name: "Lapsed customer winback",
    category: "re_engagement",
    isDefault: false,
    questions: [
      "Hi! It's been a while — we miss you. Is everything okay?",
      "Was there something about your last order or experience that put you off?",
      "We've added a lot of new products since your last visit — want me to share a few?",
      "Can I offer you something special to welcome you back?",
    ],
  },
  {
    name: "Wishlist nudge — back in stock",
    category: "re_engagement",
    isDefault: false,
    questions: [
      "Great news — [product] you saved is back in stock! Still interested?",
      "We have limited units available, so wanted to let you know first.",
      "Would you like me to place the order for you right now?",
      "Is there anything else from your wishlist you'd like to check on?",
    ],
  },
  {
    name: "Browse abandonment",
    category: "re_engagement",
    isDefault: false,
    questions: [
      "Hi! We noticed you were browsing [category/product] — find what you were looking for?",
      "Would you like more options or alternatives to what you viewed?",
      "Can I answer any questions about the products you checked out?",
      "Would a special offer help you make a decision today?",
    ],
  },
  {
    name: "Inbound lead — discover intent",
    category: "lead_qualification",
    isDefault: false,
    questions: [
      "Hi! Thanks for reaching out — what brings you here today?",
      "Are you looking for something specific, or just exploring?",
      "Have you used a product like this before, or would this be your first time?",
      "What's the most important thing you'd want from this purchase?",
    ],
  },
  {
    name: "Referral follow-up",
    category: "lead_qualification",
    isDefault: false,
    questions: [
      "Hi! A friend of yours thought you might be interested in us — did they mention us?",
      "What were you told about our product or service?",
      "Is there anything specific you'd like to know before deciding?",
      "Would you like to take advantage of the referral offer they shared?",
    ],
  },
  {
    name: "Demo / consultation booking",
    category: "lead_qualification",
    isDefault: false,
    questions: [
      "Hi! Would you be open to a quick 15-minute call to see if we're the right fit?",
      "What's the best time for you — mornings or afternoons?",
      "Is there a specific problem or goal you'd like us to address on the call?",
      "Shall I go ahead and book a slot for you?",
    ],
  },
  {
    name: "Delivery delay — proactive outreach",
    category: "order_support",
    isDefault: false,
    questions: [
      "Hi! We wanted to let you know your order is running slightly late — sorry for the wait.",
      "Your updated delivery estimate is [new date]. Does that work for you?",
      "Would you like a discount on your next order as an apology?",
      "Is there anything else we can do to make this right?",
    ],
  },
  {
    name: "Return / refund initiation",
    category: "order_support",
    isDefault: false,
    questions: [
      "Hi! We're sorry to hear you'd like to return your order. Can you tell us why?",
      "Was it a sizing issue, quality concern, or something else?",
      "Would you prefer a refund, an exchange, or store credit?",
      "Shall I go ahead and raise the return request for you right now?",
    ],
  },
  {
    name: "Post-complaint follow-up",
    category: "order_support",
    isDefault: false,
    questions: [
      "Hi! We wanted to follow up on the issue you raised earlier — has it been resolved?",
      "Are you satisfied with how we handled the situation?",
      "Is there anything more we can do for you?",
      "Would you give us another chance — we'd love to make it up to you.",
    ],
  },
];

