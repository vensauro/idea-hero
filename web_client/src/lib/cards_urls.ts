import { draw } from "radash";
export const cardsUrls = [
  "00a3fd49-a67d-4438-92e8-2dc61ef93b98.png",
  "04101468-212a-48d2-b7e4-aa5746a9cb11.png",
  "069c0d85-906b-42ba-86a6-7c41e97a95c9.png",
  "0707b746-2626-4f05-b097-814e423bea75.png",
  "09d3bfc2-8797-41fc-86aa-008c98b098aa.png",
  "0ba59d82-c596-4fc6-9cdc-b73beafffe22.png",
  "16d17b42-9b9c-4f4a-b792-5573c116ffa0.png",
  "185db6df-7fcc-4ed8-869d-e57148b956a1.png",
  "22d440f3-97b3-4de6-8bc4-e98cfe8b19b0.png",
  "230e679f-867c-465c-a99c-6db7a9efbe68.png",
  "27f865fe-60fb-4f78-8c6f-f38c57e7f649.png",
  "2fc1fbea-0f75-49f8-8c1c-e831af9340dd.png",
  "3496013c-c7cf-4a2f-9248-a0923172d20f.png",
  "380f0ddd-3b79-4af0-8200-15fade24b735.png",
  "3cc0558e-274d-4ea7-8fce-bd679de75938.png",
  "405f009f-c3b7-4a64-a5e3-ea8d33323a69.png",
  "415e74fc-ae8e-4d42-89fb-d37376845486.png",
  "43a22b71-1447-46c1-9562-9b6ed10b6616.png",
  "45ad3051-e4f0-40c3-a154-bcf5ab69d647.png",
  "45f2da33-f33f-4e51-9c24-148eeeafdd26.png",
  "5846236c-c13a-4043-bf32-c946945c6f9a.png",
  "58cafa5f-28f9-4600-8025-d23f6dcff13a.png",
  "5fa42ebe-29f0-4fdd-a6b5-dc9da41a5bd0.png",
  "653282db-365a-4dc2-9dc4-835e506093ed.png",
  "67f4d9dd-730b-4593-89ea-57f41989fb2e.png",
  "6fd1ed32-1b66-4f73-99ef-3df48c6818a4.png",
  "76621a0b-0c9b-4b96-9519-8e0d58dfb5d2.png",
  "7855a143-d37e-4c47-9ab1-438425093d5f.png",
  "7a48d04e-607c-47de-8ce1-f2c10917c7c4.png",
  "7fd539bc-54fa-4ed1-8320-e5d52ca5f15b.png",
  "80401720-3a8a-48d1-a67c-3c500eb15c2e.png",
  "89c8ab12-bca1-4d3b-a438-b063f460f515.png",
  "8b016243-226b-4b63-911b-e5910b18aa28.png",
  "906239cc-cf8b-4840-a722-c9ef70489e04.png",
  "91273aea-0441-4194-8cd9-2d492c9c684f.png",
  "920cba36-82ef-497c-b098-2fa600a48df4.png",
  "932818ee-ac7b-4160-98c7-e7797aa689bb.png",
  "9ac6fa5d-a468-47c8-99bc-af9632ebb0a3.png",
  "a26e8bc9-d63b-425c-bb65-bd6dc82a1842.png",
  "ab7b9335-22bd-4519-bfde-365148f7d219.png",
  "b0c0c414-828a-4ccb-b2c0-87fa33470ffd.png",
  "b6d97681-d71f-44a0-bad1-d94e307625c2.png",
  "b6fd12f5-dfc8-4f18-af59-0e4434c2cfd6.png",
  "cc35e51d-e9aa-40ae-b58c-f7f115f59afe.png",
  "dbd045a5-77bf-4bf8-892d-7d43e6a0197a.png",
  "e339dd91-65d1-44be-925b-d778791d05f1.png",
  "e4599a41-d0e4-4b46-9e1f-1cbbeb010efe.png",
  "e719c6d2-29e3-4ca9-a4ee-832c4cbb283b.png",
  "f7ddb3fa-e522-428c-942d-016c8f1dc94e.png",
  "ff97f815-2b43-4e6a-b2de-e0d418ec7a6d.png",
];

export function getRandomCardUrl() {
  return `/ia_cards/${draw(cardsUrls)}`;
}