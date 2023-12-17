import React, { useState, useEffect } from 'react';
import './App.css';
import OpenAI from "openai";

function App() {
  const [videoData, setVideoData] = useState(null);
  const [videoId, setVideoId] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const youtubeApiKey = ''; // Reemplaza con tu clave API de YouTube
  const openaiApiKey = ''; // Reemplaza con tu clave API de OpenAI

  const fetchVideoData = () => {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${youtubeApiKey}`;
    
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        setVideoData(data);
        setComments([]);
        fetchAllComments();
      })
      .catch(error => console.error('Error fetching YouTube data:', error));
  };

  const fetchAllComments = (pageToken = '') => {
    setLoading(true);
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${youtubeApiKey}&maxResults=100&pageToken=${pageToken}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.items && Array.isArray(data.items)) {
          setComments(prevComments => [...prevComments, ...data.items]);
          if (data.nextPageToken) {
            fetchAllComments(data.nextPageToken);
          } else {
            setLoading(false);
          }
        } else {
          console.error('Respuesta inesperada de la API:', data);
          setLoading(false);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
      });
  };

  const sendToGPT = async (commentsText) => {
    const openai = new OpenAI({
      apiKey: openaiApiKey, dangerouslyAllowBrowser: true 
    });
    
    try {
      
      const myAssistant = await openai.beta.assistants.retrieve("asst_Ha7TMHqQrpdiwtmINLkYem47"); // Reemplaza con el ID de tu asistente
      // Aquí podrías interactuar con tu asistente según tus necesidades
      const content = `Read the file and return all the times u find in format minutes:seconds, for example 3:25, min 3, sec 25\n\n${commentsText}`;
      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(thread.id, {
            role : "user",
            content: content,
      });
 
      const run = await openai.beta.threads.runs.create(
        thread.id,
        { assistant_id: myAssistant.id }
      );
      let runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );
      while (runStatus.status !== "completed") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }
      const messages = await openai.beta.threads.messages.list(thread.id);
      const lastMessageForRun = messages.data
        .filter(
          (message) => message.run_id === run.id && message.role === "assistant"
        )
        .pop();

        if (lastMessageForRun) {
          console.log(`${lastMessageForRun.content[0].text.value} \n`);
        }
      // Ejemplo: Imprimir la respuesta del asistente
      // console.log(myAssistant);
      // console.log(thread);
      // console.log(run);
    //   messages.body.data.forEach((message) => {
    //     console.log(message.content);
    // }); 
    } catch (error) {
      console.error("Error al interactuar con el asistente de OpenAI:", error);
    }
  };

  useEffect(() => {
    if (!loading && comments.length > 0) {
      const commentsText = comments.map(comment => comment.snippet.topLevelComment.snippet.textDisplay).join('\n\n');
      sendToGPT(commentsText);
    }
  }, [loading, comments]);

  return (
    <div className="container">
      <h1>YouTube Video Information</h1>
      <input
        type="text"
        className="input-field"
        value={videoId}
        onChange={(e) => setVideoId(e.target.value)}
        placeholder="Enter YouTube Video ID"
      />
      <button onClick={fetchVideoData}>Fetch Video Data</button>

      {videoData && (
        <div className="video-details">
          <h2>Video Details</h2>
          <p>Title: {videoData.items[0].snippet.title}</p>
          {/* ... Otros detalles del video ... */}
        </div>
      )}

      <button onClick={() => fetchAllComments()}>Load All Comments</button>
      {loading && <p>Loading comments...</p>}

      <div className="comments-section">
        {comments.map((comment, index) => (
          <p key={index}>{comment.snippet.topLevelComment.snippet.textDisplay}</p>
        ))}
      </div>
    </div>
  );
}

export default App;