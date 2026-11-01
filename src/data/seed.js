export const sports = [
  {
    id: "cricket",
    name: "Cricket",
    tag: "Find your innings.",
    description:
      "Build a complete game with purposeful batting, pace, spin and fielding drills.",
    skills: "Batting technique, Fast & spin bowling, Fielding and fitness",
    schedule: "Mon · Wed · Fri, 4:30 PM",
    capacity: 6,
  },
  {
    id: "football",
    name: "Football",
    tag: "Own your next move.",
    description:
      "First touch, tactical awareness and the confidence to create something special.",
    skills: "Ball control, Tactical play, Speed and endurance",
    schedule: "Tue · Thu · Sat, 6:00 AM",
    capacity: 6,
  },
  {
    id: "basketball",
    name: "Basketball",
    tag: "Raise your game.",
    description:
      "Develop your handle, find your shot and make smarter decisions on every possession.",
    skills: "Shooting, Court agility, Team play",
    schedule: "Mon · Wed · Fri, 5:30 PM",
    capacity: 6,
  },
];
export const plans = [
  {
    id: "basic",
    name: "Basic",
    price: 1499,
    months: 1,
    description: "A fresh start. A stronger routine.",
    features:
      "Small-group coaching, Two sessions each week, Monthly progress check-in",
  },
  {
    id: "standard",
    name: "Standard",
    price: 3999,
    months: 3,
    description: "Find consistency. Build momentum.",
    features:
      "Three sessions each week, Priority coach feedback, Full athlete portal",
  },
  {
    id: "premium",
    name: "Premium",
    price: 6999,
    months: 6,
    description: "Commit to your next level.",
    features:
      "Everything in Standard, Personal development plan, Match performance reviews",
  },
];
export const coaches = [
  {
    id: "coach1",
    name: "Coach Shaik",
    sportId: "cricket",
    specialty: "Senior Batting Specialist",
    experience: 10,
    bio: "Dedicated cricket mentor focusing on technique and mental toughness.",
    email: "coach1@gmail.com",
  },
  ...[
    ["arjun-menon", "Arjun Menon", "cricket", "Batting & fielding coach", 12],
    ["kavya-rao", "Kavya Rao", "cricket", "Bowling coach", 9],
    ["dev-sharma", "Dev Sharma", "football", "Head football coach", 11],
    [
      "nisha-fernandes",
      "Nisha Fernandes",
      "football",
      "Youth development coach",
      8,
    ],
    [
      "rahul-nair",
      "Rahul Nair",
      "basketball",
      "Skills & performance coach",
      10,
    ],
    [
      "meera-kapoor",
      "Meera Kapoor",
      "basketball",
      "Player development coach",
      7,
    ],
  ].map(([id, name, sportId, specialty, experience]) => ({
    id,
    name,
    sportId,
    specialty,
    experience,
    bio: "Focused coaching, individual feedback and measurable progress for every athlete.",
  })),
];
export function makeSeed() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const past = (n) => {
    let d = new Date(today);
    d.setDate(d.getDate() - n);
    return iso(d);
  };
  return {
    version: 1,
    sports,
    plans,
    coaches,
    users: [],
    subscriptions: [
      {
        id: "enrol-demo",
        studentId: "student1",
        sportId: "cricket",
        coachId: "coach1",
        planId: "standard",
        startDate: past(30),
        endDate: iso(new Date(today.getTime() + 60 * 86400000)),
        status: "Active",
      },
    ],
    payments: [
      {
        id: "receipt-demo",
        studentId: "student1",
        plan: "Standard",
        sport: "Cricket",
        amount: 3999,
        date: past(30),
        status: "Simulated",
        subscriptionId: "enrol-demo",
      },
    ],
    attendance: Array.from({ length: 8 }, (_, i) => ({
      id: "att-" + i,
      studentId: "student1",
      coachId: "coach1",
      sportId: "cricket",
      date: past(2 + i * 3),
      time: "16:30",
      drill: "Batting and fielding",
      status: i === 5 ? "Absent" : "Present",
      remarks: "",
    })),
    evaluations: [
      {
        id: "eval-1",
        studentId: "student1",
        coachId: "coach1",
        date: past(21),
        fitness: 65,
        technique: 70,
        composure: 62,
        overall: 66,
        notes: "Focus on balance through the shot.",
      },
      {
        id: "eval-2",
        studentId: "student1",
        coachId: "coach1",
        date: past(7),
        fitness: 78,
        technique: 82,
        composure: 75,
        overall: 78,
        notes: "Excellent improvement in footwork. Keep building consistency.",
      },
    ],
    messages: [],
    audit: [],
  };
}
