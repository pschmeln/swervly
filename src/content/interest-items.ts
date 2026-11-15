// Generated locally from official O*NET Web Services v2; do not edit verbatim question wording.
// Source: https://services.onetcenter.org/reference/mnm/ip/ip_questions_30
// License: https://www.onetcenter.org/license_tools.html
// Items verified word-for-word against https://www.onetcenter.org/dl_files/Mini-IP.pdf Appendix A. Do not edit after the first real answer is saved.
export type RiasecScale = "R" | "I" | "A" | "S" | "E" | "C";
export const INSTRUMENT = "onet_mini_ip_30";
export const RESPONSE_LABELS = ["Strongly Dislike","Dislike","Unsure","Like","Strongly Like"] as const;
export const ATTRIBUTION = "This page includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY-ND 4.0 license. O*NET® is a trademark of USDOL/ETA.";
export const INTEREST_ITEMS: { id: string; text: string; scale: RiasecScale }[] = [
  { id: "ip01", text: "Build kitchen cabinets", scale: "R" },
  { id: "ip02", text: "Develop a new medicine", scale: "I" },
  { id: "ip03", text: "Write books or plays", scale: "A" },
  { id: "ip04", text: "Help people with personal or emotional problems", scale: "S" },
  { id: "ip05", text: "Manage a department within a large company", scale: "E" },
  { id: "ip06", text: "Install software across computers on a large network", scale: "C" },
  { id: "ip07", text: "Repair household appliances", scale: "R" },
  { id: "ip08", text: "Study ways to reduce water pollution", scale: "I" },
  { id: "ip09", text: "Compose or arrange music", scale: "A" },
  { id: "ip10", text: "Give career guidance to people", scale: "S" },
  { id: "ip11", text: "Start your own business", scale: "E" },
  { id: "ip12", text: "Operate a calculator", scale: "C" },
  { id: "ip13", text: "Assemble electronic parts", scale: "R" },
  { id: "ip14", text: "Conduct chemical experiments", scale: "I" },
  { id: "ip15", text: "Create special effects for movies", scale: "A" },
  { id: "ip16", text: "Perform rehabilitation therapy", scale: "S" },
  { id: "ip17", text: "Negotiate business contracts", scale: "E" },
  { id: "ip18", text: "Keep shipping and receiving records", scale: "C" },
  { id: "ip19", text: "Drive a truck to deliver packages to offices and homes", scale: "R" },
  { id: "ip20", text: "Examine blood samples using a microscope", scale: "I" },
  { id: "ip21", text: "Paint sets for plays", scale: "A" },
  { id: "ip22", text: "Do volunteer work at a non-profit organization", scale: "S" },
  { id: "ip23", text: "Market a new line of clothing", scale: "E" },
  { id: "ip24", text: "Inventory supplies using a hand-held computer", scale: "C" },
  { id: "ip25", text: "Test the quality of parts before shipment", scale: "R" },
  { id: "ip26", text: "Develop a way to better predict the weather", scale: "I" },
  { id: "ip27", text: "Write scripts for movies or television shows", scale: "A" },
  { id: "ip28", text: "Teach a high-school class", scale: "S" },
  { id: "ip29", text: "Sell merchandise at a department store", scale: "E" },
  { id: "ip30", text: "Stamp, sort, and distribute mail for an organization", scale: "C" },
];
