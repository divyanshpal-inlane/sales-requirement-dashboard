import { useState, useEffect } from "react";

const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/calendar";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let gapiInited = false;
let gisInited = false;
let tokenClient: any;

const loadGoogleAPIs = () => {
  return new Promise<void>((resolve, reject) => {
    if (
      !document.querySelector('script[src="https://apis.google.com/js/api.js"]')
    ) {
      const gapiScript = document.createElement("script");
      gapiScript.src = "https://apis.google.com/js/api.js";
      gapiScript.onload = () => {
        window.gapi.load("client", async () => {
          try {
            await window.gapi.client.init({
              apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
              discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            if (gisInited) resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      gapiScript.onerror = reject;
      document.head.appendChild(gapiScript);
    }
    if (
      !document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      )
    ) {
      const gisScript = document.createElement("script");
      gisScript.src = "https://accounts.google.com/gsi/client";
      gisScript.onload = () => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: "", // Will be set later
        });
        gisInited = true;
        if (gapiInited) resolve();
      };
      gisScript.onerror = reject;
      document.head.appendChild(gisScript);
    }
  });
};

const authenticateGoogle = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }
      resolve(true);
    };
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      tokenClient.requestAccessToken({ prompt: "" });
    }
  });
};

const fetchGoogleCalendarEvents = async (startDate: Date, endDate: Date) => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 250,
      orderBy: "startTime",
    });
    return response.result.items || [];
  } catch {
    return [];
  }
};

const createGoogleCalendarEvent = async (eventData: any) => {
  const event = {
    summary: eventData.title,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: eventData.startDateTime,
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: eventData.endDateTime,
      timeZone: "Asia/Kolkata",
    },
  };
  const response = await window.gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });
  return response.result;
};

const signOutGoogle = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken("");
  }
};

const useGoogleCalendar = () => {
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleAPIReady, setGoogleAPIReady] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const initGoogle = async () => {
      try {
        await loadGoogleAPIs();
        setGoogleAPIReady(true);
        if (window.gapi?.client?.getToken()) setIsGoogleConnected(true);
      } catch {
        setGoogleAPIReady(false);
      }
    };
    initGoogle();
  }, []);

  const connect = async () => {
    if (!googleAPIReady) return;
    setIsConnecting(true);
    try {
      const success = await authenticateGoogle();
      if (success) setIsGoogleConnected(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    signOutGoogle();
    setIsGoogleConnected(false);
    setGoogleEvents([]);
  };

  const loadEvents = async (startDate: Date, endDate: Date) => {
    if (!isGoogleConnected || !googleAPIReady) return;
    const events = await fetchGoogleCalendarEvents(startDate, endDate);
    setGoogleEvents(events);
  };

  const createEvent = async (eventData: any) => {
    if (!isGoogleConnected || !googleAPIReady) throw new Error("Not connected");
    return await createGoogleCalendarEvent(eventData);
  };

  return {
    isGoogleConnected,
    googleEvents,
    connect,
    disconnect,
    loadEvents,
    createEvent,
    isConnecting,
  };
};

export default useGoogleCalendar;
