import { createApp, ref, computed } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiDecentralized } from "@graffiti-garden/implementation-decentralized";
import {
  GraffitiPlugin,
  useGraffiti,
  useGraffitiSession,
  useGraffitiDiscover,
} from "@graffiti-garden/wrapper-vue";

function setup() {
  // Initialize Graffiti
  const graffiti = useGraffiti();
  const session = useGraffitiSession();
  
  // This is the "directory" our messages will go in
  const channel = ref("designftw-26");
  const inChat = ref(false);

  // Declare a signal for the message entered in the chat
  const myMessage = ref("");
  const myChatName = ref("");

  // "Discover" messages in the chat
  const { objects: messageObjects, isFirstPoll: areMessageObjectsLoading } =
    useGraffitiDiscover(
      () => [channel.value],
      {
        properties: {
          value: {
            required: ["content", "published"],
            properties: {
              content: { type: "string" },
              published: { type: "number" },
            },
          },
        },
      },
      undefined, // Don't look for private messages
      true, // Automatically poll for new messages (realtime)
    );

  // Sort the messages by their timestamp
  const sortedMessageObjects = computed(() => {
    return messageObjects.value.toSorted((a, b) => {
      return b.value.published - a.value.published;
    });
  });

  const { objects: chats } = useGraffitiDiscover(
    ["designftw-26"],
    {
      properties: {
        value: {
          required: ["activity", "type", "channel", "title", "published"],
          properties: {
            activity: { const: "Create" },
            type: { const: "Chat" },
            channel: { type: "string" },
            title: { type: "string" },
            published: { type: "number" },
          },
        },
      }
    }
  )

  async function newChat() {
    await graffiti.post(
      {
        value: {
          activity: "Create",
          type: "Chat",
          channel: crypto.randomUUID(),
          title: myChatName.value,
          published: Date.now(),
        },
        channels: ["designftw-26"],
        allowed: [],
      },
      session.value,
    );
  }

  // A function to send a message.
  // Since the function is async, we
  // create an "isSending" signal for
  // displaying feedback.
  const isSending = ref(false);
  async function sendMessage() {
    isSending.value = true;
    try {
      await graffiti.post(
        {
          value: {
            content: myMessage.value,
            published: Date.now(),
          },
          channels: [channel.value],
        },
        session.value,
      );
      myMessage.value = "";
    } finally {
      isSending.value = false;
    }
  }

  async function switchChats(obj) {
    inChat.value = !inChat.value;
    channel.value = obj.value.channel;
  }

  // A function to delete a message.
  // Since the function is async, we
  // create an "isDeleting" signal for
  // displaying feedback.
  const isDeleting = ref(new Set());
  async function deleteMessage(message) {
    isDeleting.value.add(message.url);
    try {
      await graffiti.delete(message, session.value);
    } finally {
      isDeleting.value.delete(message.url);
    }
  }

  async function toggleMode() {
    inChat.value = !inChat.value;
  }

  return {
    myMessage,
    messageObjects,
    areMessageObjectsLoading,
    sortedMessageObjects,
    isSending,
    sendMessage,
    isDeleting,
    deleteMessage,
    newChat,
    chats,
    switchChats,
    myChatName,
    toggleMode,
    inChat,
  };
}

const App = { template: "#template", setup };

createApp(App)
  .use(GraffitiPlugin, {
    // graffiti: new GraffitiLocal(),
    graffiti: new GraffitiDecentralized(),
  })
  .mount("#app");
