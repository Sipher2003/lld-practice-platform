import { Problem } from "../domain/Problem";

export const seedProblems: Problem[] = [
  new Problem(
    "parking-lot",
    "Design a Parking Lot",
    "Design a parking lot system that manages multiple levels, parking spots of different sizes (motorcycle, compact, large), and issues tickets on entry with payment on exit.",
    [
      "The system should support multiple parking levels, each with multiple spots.",
      "Spots come in different sizes and a vehicle can only park in a compatible spot.",
      "A ticket is issued when a vehicle enters, recording entry time.",
      "On exit, a fee is calculated based on duration and the ticket is closed.",
      "The system should be able to report available spots per level.",
    ],
    ["Assume a single entry/exit gate per level for simplicity.", "No need to handle reservations."],
    "MEDIUM",
    ["ParkingSpot", "Vehicle", "Ticket", "Level", "Payment"]
  ),
  new Problem(
    "elevator-system",
    "Design an Elevator System",
    "Design the control system for a bank of elevators in a building, handling internal and external requests efficiently.",
    [
      "Multiple elevators should be coordinated by a central controller.",
      "The system must handle both hall calls (up/down from a floor) and car calls (destination from inside).",
      "Requests should be assigned to elevators using some dispatch strategy.",
      "Each elevator has its own state: current floor, direction, door status.",
      "The design should make it possible to change the dispatch strategy later.",
    ],
    ["You do not need to implement real scheduling optimization — a reasonable simple strategy is fine.", "Assume a fixed number of elevators and floors."],
    "HARD",
    ["Elevator", "ElevatorController", "Request", "Dispatcher", "Floor"]
  ),
  new Problem(
    "vending-machine",
    "Design a Vending Machine",
    "Design a vending machine that accepts coins/cash, lets a user select a product, dispenses it, and returns change.",
    [
      "The machine holds multiple products, each with a price and stock count.",
      "A user can insert money incrementally and select a product.",
      "The machine should dispense the product and correct change, or reject the selection if funds are insufficient or stock is empty.",
      "The machine has distinct states (idle, has money, dispensing, out of stock) that govern which actions are valid.",
      "It should be possible to restock or reprice products.",
    ],
    ["Assume exact denominations are available for change for simplicity.", "No network/payment-card integration needed."],
    "EASY",
    ["Product", "Inventory", "VendingMachineState", "Transaction", "Coin"]
  ),
];
