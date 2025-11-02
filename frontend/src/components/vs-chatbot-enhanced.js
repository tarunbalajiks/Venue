import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import GraphVisualizer from "./vs-graph-visualizer";

export default function EnhancedChatBox({ role, onResetReady }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const graphContainerRef = useRef(null);
  const pathAnimationRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [textInformation, setTextInformation] = useState(null);
  const [graphPathVisualisation, setGraphPathVisualisation] = useState(null);
  const [highlightedEdges, setHighlightedEdges] = useState(new Set());
  const [animatingEdges, setAnimatingEdges] = useState(new Map());
  const [inputPosition, setInputPosition] = useState("center"); 
  const [hasEverHadTextInfo, setHasEverHadTextInfo] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [bookingData, setBookingData] = useState({
    eventName: '',
    eventDescription: '',
    dateFrom: '',
    dateTo: '',
    timeFrom: '',
    timeTo: ''
  });
  const [isBooking, setIsBooking] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [manualEmails, setManualEmails] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvEmails, setCsvEmails] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const resetToHome = useCallback(() => {
    setGraphData(null);
    setTextInformation(null);
    setGraphPathVisualisation(null);
    setHighlightedEdges(new Set());
    setAnimatingEdges(new Map());
    setInputPosition("center");
    setSelectedVenue(null);
    setInput("");
    setHasEverHadTextInfo(false);
    setShowSuccessModal(false);
    setBookingError(null);
    setShowBookingModal(false);
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (onResetReady) {
      onResetReady(resetToHome);
    }
  }, [onResetReady, resetToHome]);

  useEffect(() => {
    if (!graphData && !textInformation && !isLoading) {
      setInputPosition("center");
    } else if ((graphData || textInformation) && inputPosition === "center") {
      setInputPosition("bottom");
    }
  }, [graphData, textInformation, isLoading, inputPosition]);

  useEffect(() => {
    if (graphData && graphData.nodes && !selectedVenue) {
      const bestVenue = graphData.nodes.find(node => node.group === 'best');
      if (bestVenue) {
        setSelectedVenue(bestVenue);
      }
    }
  }, [graphData, selectedVenue]);

  useEffect(() => {
    if (!graphPathVisualisation || !graphData) {
      setHighlightedEdges(new Set());
      setAnimatingEdges(new Map());
      return;
    }

    const pathNumbers = Object.keys(graphPathVisualisation)
      .map(Number)
      .sort((a, b) => a - b);

    if (pathNumbers.length === 0) {
      setHighlightedEdges(new Set());
      setAnimatingEdges(new Map());
      return;
    }

    let currentPathIndex = 0;
    const accumulatedEdges = new Set();
    let isCancelled = false;
    const animationSteps = 20;
    const timeouts = new Set();

    const animateSingleEdge = (edgeKey, onComplete) => {
      if (isCancelled) return;

      let currentStep = 0;

      const animateStep = () => {
        if (isCancelled || currentStep >= animationSteps) {
          if (currentStep >= animationSteps) {
            accumulatedEdges.add(edgeKey);
            setHighlightedEdges(new Set(accumulatedEdges));
            
            setAnimatingEdges(prev => {
              const newMap = new Map(prev);
              newMap.delete(edgeKey);
              return newMap;
            });

            if (onComplete) onComplete();
          }
          return;
        }

        const progress = (currentStep + 1) / animationSteps;
        
        setAnimatingEdges(prev => {
          const newMap = new Map(prev);
          newMap.set(edgeKey, progress);
          return newMap;
        });

        currentStep++;

        const timeoutId = setTimeout(animateStep, 40);
        timeouts.add(timeoutId);
      };

      animateStep();
    };

    const animatePath = (pathNumber) => {
      if (isCancelled || currentPathIndex >= pathNumbers.length) {
        return;
      }

      const pathEdges = graphPathVisualisation[pathNumber];
      
      if (!pathEdges) {
        currentPathIndex++;
        if (currentPathIndex < pathNumbers.length && !isCancelled) {
          const nextPathNumber = pathNumbers[currentPathIndex];
          const timeoutId = setTimeout(() => {
            animatePath(nextPathNumber);
          }, 200);
          timeouts.add(timeoutId);
        }
        return;
      }

      let edgesArray = [];
      if (Array.isArray(pathEdges)) {
        edgesArray = pathEdges;
      } else if (typeof pathEdges === 'object') {
        if (pathEdges.edges && Array.isArray(pathEdges.edges)) {
          edgesArray = pathEdges.edges;
        } else if (pathEdges.links && Array.isArray(pathEdges.links)) {
          edgesArray = pathEdges.links;
        } else {
          edgesArray = Object.values(pathEdges).filter(item => 
            item && (item.source || item.from) && (item.target || item.to)
          );
        }
      }

      if (edgesArray.length === 0) {
        currentPathIndex++;
        if (currentPathIndex < pathNumbers.length && !isCancelled) {
          const nextPathNumber = pathNumbers[currentPathIndex];
          const timeoutId = setTimeout(() => {
            animatePath(nextPathNumber);
          }, 200);
          timeouts.add(timeoutId);
        }
        return;
      }

      let completedEdges = 0;
      const totalEdges = edgesArray.length;

      edgesArray.forEach(edge => {
        const source = edge.source || edge.from;
        const target = edge.target || edge.to;
        
        if (!source || !target) {
          completedEdges++;
          if (completedEdges === totalEdges && !isCancelled) {
            currentPathIndex++;
            if (currentPathIndex < pathNumbers.length) {
              const nextPathNumber = pathNumbers[currentPathIndex];
              const timeoutId = setTimeout(() => {
                animatePath(nextPathNumber);
              }, 200);
              timeouts.add(timeoutId);
            }
          }
          return;
        }

        const edgeKey = `${source}-${target}`;
        
        animateSingleEdge(edgeKey, () => {
          completedEdges++;
          
          if (completedEdges === totalEdges && !isCancelled) {
            currentPathIndex++;
            
            if (currentPathIndex < pathNumbers.length) {
              const nextPathNumber = pathNumbers[currentPathIndex];
              const timeoutId = setTimeout(() => {
                animatePath(nextPathNumber);
              }, 200);
              timeouts.add(timeoutId);
            }
          }
        });
      });
    };

    const initialTimeoutId = setTimeout(() => {
      if (!isCancelled && pathNumbers.length > 0) {
        animatePath(pathNumbers[0]);
      }
    }, 1000);
    timeouts.add(initialTimeoutId);

    return () => {
      isCancelled = true;
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
      timeouts.clear();
      setHighlightedEdges(new Set());
      setAnimatingEdges(new Map());
    };
  }, [graphPathVisualisation, graphData]);


  const processChildren = (parentNode, children, nodes, links, nodeMap, depth = 1) => {
    if (!children || !Array.isArray(children)) return;
    
    children.forEach((child) => {
      const childId = child.id || `${parentNode.id}-child-${depth}`;
      
      let nodeType = 'child';
      let nodeSize = 6;
      if (depth === 1) {
        nodeType = 'node';
        nodeSize = 8;
      }
      
      const childNode = {
        id: childId,
        label: child.label || child.name || childId,
        type: nodeType,
        size: nodeSize,
        ...child
      };
      
      nodes.push(childNode);
      nodeMap.set(childId, childNode);
      
      links.push({
        source: parentNode.id,
        target: childId,
        color: depth === 1 ? '#a855f7' : '#ec4899', 
        width: depth === 1 ? 2 : 1.5
      });
      
      if (child.children && Array.isArray(child.children) && child.children.length > 0) {
        processChildren(childNode, child.children, nodes, links, nodeMap, depth + 1);
      }
    });
  };

  const parseJsonToGraph = (dataObj) => {
    try {
      const data = typeof dataObj === 'string' ? JSON.parse(dataObj) : dataObj;
      
      const graphData = data.response || data;
      
      const nodes = [];
      const links = [];
      const nodeMap = new Map();

      if (graphData.nodes && Array.isArray(graphData.nodes) && graphData.links && Array.isArray(graphData.links)) {
        graphData.nodes.forEach((node) => {
          const nodeObj = {
            id: node.id || `node-${nodes.length}`,
            label: node.label || node.name || node.id || `Node ${nodes.length}`,
            type: node.type || 'node',
            size: node.size || 8,
            ...node
          };
          nodes.push(nodeObj);
          nodeMap.set(nodeObj.id, nodeObj);
        });

        graphData.links.forEach((edge) => {
          const sourceId = edge.source || edge.from;
          const targetId = edge.target || edge.to;
          
          if (!sourceId || !targetId) return;

          const sourceNode = typeof sourceId === 'string' ? nodeMap.get(sourceId) : sourceId;
          const targetNode = typeof targetId === 'string' ? nodeMap.get(targetId) : targetId;

          if (sourceNode && targetNode) {
            links.push({
              source: typeof sourceId === 'string' ? sourceId : sourceId.id,
              target: typeof targetId === 'string' ? targetId : targetId.id,
              color: edge.color || '#a855f7',
              width: edge.width || 2,
              ...edge
            });
          }
        });

        return { nodes, links };
      }

      if (graphData.root) {
        const rootNode = {
          id: graphData.root.id || 'root1',
          label: graphData.root.label || graphData.root.name || 'Root',
          type: 'root',
          size: 12,
          ...graphData.root
        };
        nodes.push(rootNode);
        nodeMap.set(rootNode.id, rootNode);

        if (graphData.root.children && Array.isArray(graphData.root.children)) {
          processChildren(rootNode, graphData.root.children, nodes, links, nodeMap, 1);
        }
      }

      if (graphData.edges && Array.isArray(graphData.edges)) {
        graphData.edges.forEach((edge) => {
          const sourceId = edge.source || edge.from;
          const targetId = edge.target || edge.to;
          
          if (!sourceId || !targetId) return;
          
          const linkExists = links.some(
            link => link.source === sourceId && link.target === targetId
          );
          
          if (!linkExists && nodeMap.has(sourceId) && nodeMap.has(targetId)) {
            links.push({
              source: sourceId,
              target: targetId,
              color: '#a855f7',
              width: 2,
              ...edge
            });
          }
        });
      }

      return { nodes, links };
    } catch (error) {
      console.error('Error parsing JSON to graph:', error);
      return null;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const queryText = input;
    setInput("");
    setIsLoading(true);

    setInputPosition("bottom");
    
    setGraphData(null);
    setTextInformation(null);
    setGraphPathVisualisation(null);
    setHighlightedEdges(new Set());
    setAnimatingEdges(new Map());

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/vsapi";
      const response = await fetch(`${API_BASE_URL}/chat/query`,  {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });
      const data = await response.json();

      console.log("Response from backend:", data);

      if (data && data.textInformation) {
        setTextInformation(data.textInformation);
        setHasEverHadTextInfo(true);
      } else {
        setTextInformation(null);
      }

      if (data && (data.path || data.graphPathVisualisation)) {
        setGraphPathVisualisation(data.path || data.graphPathVisualisation);
      } else {
        setGraphPathVisualisation(null);
        setHighlightedEdges(new Set());
        setAnimatingEdges(new Map());
      }

      if (data && ((data.nodes && Array.isArray(data.nodes) && data.links && Array.isArray(data.links)) || 
                   data.root || 
                   (data.edges && Array.isArray(data.edges)))) {
        const parsed = parseJsonToGraph(data);
        if (parsed) {
          setGraphData(parsed);
          setSelectedVenue(null);
        }
      } else if (data && (data.organizer || data.event_type || data.requirements || data.constraints)) {
        const graphFromExtracted = createGraphFromExtractedData(data);
        if (graphFromExtracted) {
          setGraphData(graphFromExtracted);
          setSelectedVenue(null);
        }
      }
    } catch (err) {
      console.error("Error fetching response:", err);
      alert(`Error processing your query: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setBookingError('Please upload a valid CSV file.');
      return;
    }

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const emails = [];

        lines.forEach((line, index) => {
          if (index === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('e-mail'))) {
            return;
          }

          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          values.forEach(value => {
            if (value) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (emailRegex.test(value)) {
                emails.push(value.toLowerCase());
              }
            }
          });
        });

        const uniqueEmails = [...new Set(emails)];
        setCsvEmails(uniqueEmails);
        setBookingError(null);
      } catch (err) {
        console.error('Error parsing CSV:', err);
        setBookingError('Error reading CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const parseManualEmails = (text) => {
    if (!text.trim()) return [];
    
    const emails = text
      .split(/[,\n;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .map(email => email.toLowerCase());

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter(email => emailRegex.test(email));
    return [...new Set(validEmails)];
  };

  const getAllEmails = () => {
    const manualEmailList = parseManualEmails(manualEmails);
    const allEmails = [...manualEmailList, ...csvEmails];
    return [...new Set(allEmails)]; // Remove duplicates
  };

  const validateBooking = (dataToValidate = null, emailsToValidate = null) => {
    const data = dataToValidate || bookingData;
    const emails = emailsToValidate !== null ? emailsToValidate : manualEmails;
    
    if (!data.eventName || !data.eventName.trim()) {
      return "Please enter an event name.";
    }
    if (data.eventName.trim().length < 3) {
      return "Event name must be at least 3 characters long.";
    }
    if (data.eventName.trim().length > 100) {
      return "Event name must be no more than 100 characters long.";
    }
    if (!data.dateFrom || !data.dateTo || !data.timeFrom || !data.timeTo) {
      return "Please fill in all date and time fields.";
    }
    
    const manualEmailList = parseManualEmails(emails);
    if (manualEmailList.length === 0 && csvEmails.length === 0) {
      return "Please upload a CSV file or enter at least one email manually.";
    }

    const now = new Date();
    const dateFrom = new Date(data.dateFrom);
    const dateTo = new Date(data.dateTo);
    
    const [fromHours, fromMinutes] = data.timeFrom.split(':').map(Number);
    const fromDateTime = new Date(dateFrom);
    fromDateTime.setHours(fromHours, fromMinutes, 0, 0);
    
    const [toHours, toMinutes] = data.timeTo.split(':').map(Number);
    const toDateTime = new Date(dateTo);
    toDateTime.setHours(toHours, toMinutes, 0, 0);

    if (fromDateTime < now) {
      return "Booking date and time cannot be in the past.";
    }

    if (toDateTime < now) {
      return "End date and time cannot be in the past.";
    }

    if (dateFrom > dateTo) {
      return "End date must be after start date.";
    }

    if (dateFrom.getTime() === dateTo.getTime() && fromDateTime >= toDateTime) {
      return "End time must be after start time.";
    }

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    if (dateFrom > sixMonthsFromNow) {
      return "Bookings cannot be made more than 6 months in advance.";
    }

    if (dateTo > sixMonthsFromNow) {
      return "Bookings cannot extend more than 6 months in the future.";
    }

    return null;
  };

  const handleBooking = async (bookingPayload = null) => {
    if (!bookingPayload) {
      console.error("No booking payload provided");
      return;
    }

    try {
      const { 
        eventName, 
        eventDescription, 
        dateFrom, 
        dateTo, 
        timeFrom, 
        timeTo, 
        manualEmails, 
        csvEmails, 
        selectedVenue 
      } = bookingPayload;

      if (!selectedVenue) {
        alert("No venue selected. Please select a venue first.");
        return;
      }

      const parseManualEmails = (text) => {
        if (!text || !text.trim()) return [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return text
          .split(/[,\n;]/)
          .map(email => email.trim().toLowerCase())
          .filter(email => email.length > 0 && emailRegex.test(email));
      };

      const manualEmailList = parseManualEmails(manualEmails || '');
      const allEmails = [...manualEmailList, ...(csvEmails || [])];
      const uniqueEmails = [...new Set(allEmails)];

      const requestedAmenities = getRequestedAmenities();
      const venueAmenities = getVenueAmenities(selectedVenue);
      
      const guaranteedAmenities = [];
      const potentialAmenities = [];

      requestedAmenities.forEach(reqAmenity => {
        const reqAmenityLower = reqAmenity.toLowerCase().trim();
        const hasMatchingVenueAmenity = venueAmenities.some(venueAmenity => {
          const venueAmenityLabel = (venueAmenity.label || venueAmenity.id || '').toLowerCase().trim();
          return venueAmenityLabel === reqAmenityLower || 
                 venueAmenityLabel.includes(reqAmenityLower) || 
                 reqAmenityLower.includes(venueAmenityLabel);
        });

        if (hasMatchingVenueAmenity) {
          guaranteedAmenities.push(reqAmenity);
        } else {
          potentialAmenities.push(reqAmenity);
        }
      });

      const bookingPayloadToSend = {
        eventName: (eventName || '').trim(),
        eventDescription: (eventDescription || '').trim() || null,
        
        venueId: selectedVenue.id,
        venueName: formatVenueLabel(selectedVenue.label || selectedVenue.id || ''),
        venueGroup: selectedVenue.group || null,
        
        venueMeta: {
          capacity: selectedVenue.meta?.capacity || null,
          coverage: selectedVenue.meta?.coverage || null,
          slack: selectedVenue.meta?.slack || null,
          matched: selectedVenue.meta?.matched || null,
          score: selectedVenue.meta?.score || extractScore(selectedVenue)
        },
        
        score: extractScore(selectedVenue),
        
        guaranteedAmenities: guaranteedAmenities,
        potentialAmenities: potentialAmenities,
        allAmenities: venueAmenities.map(a => a.label || a.id || ''),
        
        dateFrom: dateFrom,
        dateTo: dateTo,
        timeFrom: timeFrom,
        timeTo: timeTo,
        
        emails: uniqueEmails,
        emailCount: uniqueEmails.length,
        
        venueData: selectedVenue
      };

      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/vsapi";
      const response = await fetch(`${API_BASE_URL}/chat/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayloadToSend),
      });

      if (!response.ok) {
        throw new Error(`Booking failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.hasClash === true) {
        const clashingBookings = result.clashingBookings || [];
        let clashMessage = result.error || "Booking conflict detected. The venue is already booked during the requested time.";
        
        if (clashingBookings.length > 0) {
          clashMessage += "\n\nConflicting bookings:";
          clashingBookings.forEach((clash, index) => {
            clashMessage += `\n${index + 1}. "${clash.eventName || 'Unknown Event'}"`;
            clashMessage += `\n   ${clash.dateFrom} ${clash.timeFrom} - ${clash.dateTo} ${clash.timeTo}`;
          });
        }
        
        setBookingError(clashMessage);
        return;
      }
      
      if (result.success) {
        if (result.parsedData) {
          console.log("Booking data parsed by backend:", result.parsedData);
        }

        if (uniqueEmails.length > 0) {
          try {
            const dateFromObj = new Date(dateFrom);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];
            const month = monthNames[dateFromObj.getMonth()];
            const day = dateFromObj.getDate();
            const year = dateFromObj.getFullYear();
            const dateFormatted = `${month} ${day}, ${year}`;
            
            const [hoursFrom, minutesFrom] = timeFrom.split(':').map(Number);
            let hours12 = hoursFrom % 12;
            if (hours12 === 0) hours12 = 12;
            const ampm = hoursFrom >= 12 ? 'PM' : 'AM';
            const timeFormatted = `${hours12.toString().padStart(2, '0')}:${minutesFrom.toString().padStart(2, '0')} ${ampm}`;
            
            const emailPayload = {
              event_info: {
                name: (eventName || '').trim() || `Venue Booking: ${formatVenueLabel(selectedVenue.label || selectedVenue.id || '')}`,
                date: dateFormatted,
                time: timeFormatted,
                location: formatVenueLabel(selectedVenue.label || selectedVenue.id || ''),
                duration_minutes: Math.round((new Date(dateTo + 'T' + timeTo) - new Date(dateFrom + 'T' + timeFrom)) / (1000 * 60)),
                description: (eventDescription || '').trim() || `You're invited to an event at ${formatVenueLabel(selectedVenue.label || selectedVenue.id || '')} on ${dateFormatted} at ${timeFormatted}.`
              },
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
              recipients: uniqueEmails
            };

            const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/vsapi";
            const emailResponse = await fetch(`${API_BASE_URL}/chat/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload),
            });

            const emailResult = await emailResponse.json();
            
            if (emailResult.success) {
              setShowBookingModal(false);
              setShowSuccessModal(true);
            } else {
              alert(`Booking successful, but failed to send emails: ${emailResult.error || 'Unknown error occurred.'}`);
              setShowBookingModal(false);
            }
          } catch (emailErr) {
            console.error("Error sending emails:", emailErr);
            alert(`Booking successful, but failed to send emails: ${emailErr.message}. Please try again.`);
            setShowBookingModal(false);
          }
        } else {
          setShowBookingModal(false);
          setShowSuccessModal(true);
        }
      } else {
        alert(`Booking failed: ${result.error || 'Unknown error occurred.'}`);
      }
    } catch (err) {
      console.error("Error booking venue:", err);
      alert(`Error booking venue: ${err.message}. Please try again.`);
      throw err;
    }
  };

  const createGraphFromExtractedData = (data) => {
    try {
      const nodes = [];
      const links = [];
      
      const rootNode = {
        id: "event",
        label: data.event_type || "Event",
        type: "root",
        size: 16
      };
      nodes.push(rootNode);
      
      if (data.organizer) {
        const orgNode = {
          id: "organizer",
          label: `Organizer: ${data.organizer}`,
          type: "node",
          size: 10
        };
        nodes.push(orgNode);
        links.push({
          source: "event",
          target: "organizer",
          color: "#a855f7",
          width: 2
        });
      }
      
      if (data.attendees) {
        const attendNode = {
          id: "attendees",
          label: `Attendees: ${data.attendees}`,
          type: "node",
          size: 10
        };
        nodes.push(attendNode);
        links.push({
          source: "event",
          target: "attendees",
          color: "#a855f7",
          width: 2
        });
      }
      
      if (data.requirements && Array.isArray(data.requirements)) {
        data.requirements.forEach((req, idx) => {
          const reqNode = {
            id: `req-${idx}`,
            label: req,
            type: "child",
            size: 8
          };
          nodes.push(reqNode);
          links.push({
            source: "event",
            target: `req-${idx}`,
            color: "#ec4899",
            width: 1.5
          });
        });
      }
      
      if (data.constraints && Array.isArray(data.constraints)) {
        data.constraints.forEach((constraint, idx) => {
          const constraintNode = {
            id: `constraint-${idx}`,
            label: constraint,
            type: "child",
            size: 8
          };
          nodes.push(constraintNode);
          links.push({
            source: "event",
            target: `constraint-${idx}`,
            color: "#f59e0b",
            width: 1.5
          });
        });
      }
      
      return { nodes, links };
    } catch (error) {
      console.error("Error creating graph from extracted data:", error);
      return null;
    }
  };


  const getVenueNodes = () => {
    if (!graphData || !graphData.nodes) return [];
    
    return graphData.nodes.filter(node => 
      node.group === 'best' || node.group === 'shortlist'
    );
  };

  const formatVenueLabel = (label) => {
    if (!label) return '';
    
   
    let formatted = label.replace(/[·•]\s*[^·•\n]*?[·•]\s*[^\n]*/g, '').trim();
    
    formatted = formatted.replace(/\b(cap|score|capacity|capacity_score|score_value)\s+\d+[\.\d]*\s*/gi, '').trim();
    
    formatted = formatted.replace(/_/g, ' ');
    
    formatted = formatted.split(' ').map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
    
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    return formatted;
  };

  const venueNodes = getVenueNodes();

  const getRootNode = () => {
    if (!graphData || !graphData.nodes) return null;
    return graphData.nodes.find(node => 
      node.id && (node.id.toLowerCase().includes('root') || node.type === 'root')
    );
  };

  const getRequestedAmenities = () => {
    const rootNode = getRootNode();
    if (!rootNode || !rootNode.meta || !rootNode.meta.required) return [];
    return Array.isArray(rootNode.meta.required) ? rootNode.meta.required : [];
  };

  const getVenueAmenities = (venueNode) => {
    if (!venueNode || !venueNode.id || !graphData || !graphData.nodes) return [];
    
    const venueId = venueNode.id;
    return graphData.nodes.filter(node => 
      node.group === 'amenity' && 
      node.id && 
      node.id.startsWith(venueId)
    );
  };

  const extractScore = (node) => {
    if (!node) return null;
    
    if (node.score !== undefined && node.score !== null) {
      return parseFloat(node.score);
    }
    if (node.meta && node.meta.score !== undefined && node.meta.score !== null) {
      return parseFloat(node.meta.score);
    }
    
    const label = node.label || '';
    if (!label) return null;
    
    let scoreMatch = label.match(/(?:score|Score)[\s:]*(\d+\.?\d*)/i);
    if (scoreMatch) {
      return parseFloat(scoreMatch[1]);
    }
    
    scoreMatch = label.match(/[\u00b7\u2022•]\s*score\s*(\d+\.?\d*)/i);
    if (scoreMatch) {
      return parseFloat(scoreMatch[1]);
    }
    
    scoreMatch = label.match(/score[\s:]*(\d+\.?\d*)/i);
    if (scoreMatch) {
      return parseFloat(scoreMatch[1]);
    }
    
    const numbers = label.match(/(\d+\.\d+)/g);
    if (numbers && numbers.length > 0) {
      const scoreNumbers = numbers.map(n => parseFloat(n)).filter(n => n > 0 && n <= 1);
      if (scoreNumbers.length > 0) {
        return scoreNumbers[0];
      }
    }
    
    return null;
  };

  const renderVenueDetails = () => {
    if (!selectedVenue) return null;

    const requestedAmenities = getRequestedAmenities();
    const venueAmenities = getVenueAmenities(selectedVenue);
    const venueLabel = formatVenueLabel(selectedVenue.label || selectedVenue.id || '');

    const guaranteedAmenities = [];
    const potentialAmenities = [];

    requestedAmenities.forEach(reqAmenity => {
      const reqAmenityLower = reqAmenity.toLowerCase().trim();
      const hasMatchingVenueAmenity = venueAmenities.some(venueAmenity => {
        const venueAmenityLabel = (venueAmenity.label || venueAmenity.id || '').toLowerCase().trim();
        return venueAmenityLabel === reqAmenityLower || 
               venueAmenityLabel.includes(reqAmenityLower) || 
               reqAmenityLower.includes(venueAmenityLabel);
      });

      if (hasMatchingVenueAmenity) {
        guaranteedAmenities.push(reqAmenity);
      } else {
        potentialAmenities.push(reqAmenity);
      }
    });

  return (
      <div className="text-white/90 text-base leading-relaxed pr-2 flex flex-col h-full relative">
        <div className="mb-6">
          <p className="text-white/70 text-sm mb-1">Venue Name:</p>
          <h3 className="text-2xl font-bold text-white">{venueLabel}</h3>
              </div>

        {guaranteedAmenities.length > 0 && (
          <div className="mb-6">
            <p className="text-white/90 font-semibold mb-3">Guaranteed Amenities:</p>
            <div className="flex flex-col gap-2">
              {guaranteedAmenities.map((amenity, index) => (
                <div
                  key={index}
                  className="relative px-3 py-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 35%, rgba(29, 78, 216, 0.2) 65%, rgba(30, 64, 175, 0.2) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <span className="text-white font-medium flex items-center gap-2">
                    {amenity}
                    <svg
                      className="w-4 h-4 text-green-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                        d="M5 13l4 4L19 7"
                    />
                  </svg>
                  </span>
            </div>
              ))}
            </div>
                </div>
              )}
              
        {potentialAmenities.length > 0 && (
          <div className="mb-6">
            <p className="text-white/90 font-semibold mb-3">Potential Amenities:</p>
            <div className="flex flex-col gap-2">
              {potentialAmenities.map((amenity, index) => (
                <div
                  key={index}
                  className="relative px-3 py-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 35%, rgba(29, 78, 216, 0.2) 65%, rgba(30, 64, 175, 0.2) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <span className="text-white font-medium flex items-center gap-2">
                    {amenity}
                    <svg
                      className="w-4 h-5 text-yellow-400 flex-shrink-0"
                    fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                      <path d="M9.09 8a3 3 0 0 1 5.83 1c0 2.5-3 4-3 4" />
                      <line x1="12" y1="19" x2="12.01" y2="19" />
                </svg>
                  </span>
                    </div>
              ))}
                    </div>
                    </div>
                  )}

        <div className="mt-auto pt-6 flex justify-center">
          <button
            onClick={() => setShowBookingModal(true)}
            className="gradient-outline-button px-8 py-3 rounded-lg text-white font-medium transition-all duration-300 hover:scale-105"
          >
            Book
          </button>
                    </div>
            </div>
    );
  };

const BookingModal = memo(({ 
  onClose, 
  onBooking, 
  selectedVenue,
  isBooking,
  bookingError: parentBookingError,
  onClearBookingError
}) => {
  const [modalBookingData, setModalBookingData] = useState({
    eventName: '',
    eventDescription: '',
    dateFrom: '',
    dateTo: '',
    timeFrom: '',
    timeTo: ''
  });
  const [modalManualEmails, setModalManualEmails] = useState('');
  const [modalCsvEmails, setModalCsvEmails] = useState([]);
  const [modalCsvFileName, setModalCsvFileName] = useState('');
  const [modalBookingError, setModalBookingError] = useState(null);
  const [emailValidationError, setEmailValidationError] = useState(null);

  const eventNameRef = useRef(null);
  const eventDescriptionRef = useRef(null);
  const textareaRef = useRef(null);
  
  useEffect(() => {
    if (parentBookingError) {
      setModalBookingError(parentBookingError);
    } else {
      setModalBookingError(null);
    }
  }, [parentBookingError]);

  useEffect(() => {
    if (eventNameRef.current) {
      eventNameRef.current.value = modalBookingData.eventName;
    }
    if (eventDescriptionRef.current) {
      eventDescriptionRef.current.value = modalBookingData.eventDescription;
    }
    if (textareaRef.current) {
      textareaRef.current.value = modalManualEmails;
    }
  }, []);

  useEffect(() => {
    const eventNameInput = eventNameRef.current;
    if (!eventNameInput) return;
    
    const updateCounter = () => {
      const lengthSpan = document.getElementById('event-name-length');
      const checkSpan = document.getElementById('event-name-check');
      if (lengthSpan) lengthSpan.textContent = eventNameInput.value.length;
      if (checkSpan) checkSpan.textContent = eventNameInput.value.length >= 3 ? '✓' : '(min 3)';
    };
    
    eventNameInput.addEventListener('input', updateCounter);
    updateCounter();
    return () => eventNameInput.removeEventListener('input', updateCounter);
  }, []);

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setModalBookingError('Please upload a valid CSV file.');
      return;
    }

    setModalCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const emails = [];

        lines.forEach((line, index) => {
          if (index === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('e-mail'))) {
            return;
          }

          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          values.forEach(value => {
            if (value) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (emailRegex.test(value)) {
                emails.push(value.toLowerCase());
              }
            }
          });
        });

        const uniqueEmails = [...new Set(emails)];
        setModalCsvEmails(uniqueEmails);
        setModalBookingError(null);
      } catch (err) {
        console.error('Error parsing CSV:', err);
        setModalBookingError('Error reading CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const parseManualEmails = (text) => {
    if (!text.trim()) return [];
    
    const emails = text
      .split(/[,\n;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .map(email => email.toLowerCase());

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter(email => emailRegex.test(email));
    return [...new Set(validEmails)];
  };

  const getAllEmails = () => {
    const manualEmailList = parseManualEmails(modalManualEmails);
    const allEmails = [...manualEmailList, ...modalCsvEmails];
    return [...new Set(allEmails)];
  };

  	const validateBooking = () => {
    const eventNameValue = eventNameRef.current?.value || '';
    const eventDescriptionValue = eventDescriptionRef.current?.value || '';
    const manualEmailsValue = textareaRef.current?.value || '';

    if (!eventNameValue.trim()) {
      return "Please enter an event name.";
    }
    if (eventNameValue.trim().length < 3) {
      return "Event name must be at least 3 characters long.";
    }
    if (eventNameValue.trim().length > 100) {
      return "Event name must be no more than 100 characters long.";
    }
    if (!modalBookingData.dateFrom || !modalBookingData.dateTo || !modalBookingData.timeFrom || !modalBookingData.timeTo) {
      return "Please fill in all date and time fields.";
    }
    
    const manualEmailList = parseManualEmails(manualEmailsValue);
    if (manualEmailList.length === 0 && modalCsvEmails.length === 0) {
      return "Please upload a CSV file or enter at least one email manually.";
    }

    const now = new Date();
    const dateFrom = new Date(modalBookingData.dateFrom);
    const dateTo = new Date(modalBookingData.dateTo);
    
    const [fromHours, fromMinutes] = modalBookingData.timeFrom.split(':').map(Number);
    const fromDateTime = new Date(dateFrom);
    fromDateTime.setHours(fromHours, fromMinutes, 0, 0);
    
    const [toHours, toMinutes] = modalBookingData.timeTo.split(':').map(Number);
    const toDateTime = new Date(dateTo);
    toDateTime.setHours(toHours, toMinutes, 0, 0);

    if (fromDateTime < now) {
      return "Booking date and time cannot be in the past.";
    }

    if (toDateTime < now) {
      return "End date and time cannot be in the past.";
    }

    if (dateFrom > dateTo) {
      return "End date must be after start date.";
    }

    if (dateFrom.getTime() === dateTo.getTime() && fromDateTime >= toDateTime) {
      return "End time must be after start time.";
    }

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    if (dateFrom > sixMonthsFromNow) {
      return "Bookings cannot be made more than 6 months in advance.";
    }

    if (dateTo > sixMonthsFromNow) {
      return "Bookings cannot extend more than 6 months in the future.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setModalBookingError(null);
    if (onClearBookingError) {
      onClearBookingError();
    }
    
    const eventNameValue = eventNameRef.current?.value || '';
    const eventDescriptionValue = eventDescriptionRef.current?.value || '';
    const manualEmailsValue = textareaRef.current?.value || '';

    setModalBookingData(prev => ({
        ...prev,
      eventName: eventNameValue,
      eventDescription: eventDescriptionValue
    }));
    setModalManualEmails(manualEmailsValue);

    const validationError = validateBooking();
    if (validationError) {
      setModalBookingError(validationError);
      return;
    }

    const bookingPayload = {
      eventName: eventNameValue.trim(),
      eventDescription: eventDescriptionValue.trim(),
      dateFrom: modalBookingData.dateFrom,
      dateTo: modalBookingData.dateTo,
      timeFrom: modalBookingData.timeFrom,
      timeTo: modalBookingData.timeTo,
      manualEmails: manualEmailsValue,
      csvEmails: modalCsvEmails,
      selectedVenue: selectedVenue
    };

    try {
      await onBooking(bookingPayload);
    } catch (err) {
      console.error("Booking error in modal:", err);
    }
  };

  const handleEmailBlur = () => {
    if (textareaRef.current) {
      const currentValue = textareaRef.current.value || '';
      const parsedEmails = parseManualEmails(currentValue);
      const invalidEntries = currentValue
        .split(/[,\n;]/)
        .map(e => e.trim())
        .filter(e => e.length > 0)
        .filter(e => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return !emailRegex.test(e.toLowerCase());
        });
      
      if (invalidEntries.length > 0) {
        setEmailValidationError(`Invalid email${invalidEntries.length > 1 ? 's' : ''}: ${invalidEntries.slice(0, 3).join(', ')}${invalidEntries.length > 3 ? '...' : ''}`);
      } else if (parsedEmails.length === 0 && currentValue.trim().length > 0) {
        setEmailValidationError('No valid emails found. Please enter valid email addresses.');
    } else {
        setEmailValidationError(null);
        setModalManualEmails(currentValue);
      }
    }
  };

  const emailCounts = {
    manualCount: parseManualEmails(modalManualEmails).length,
    totalCount: getAllEmails().length
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="graph-panel rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-xl font-bold text-white">Book Venue</h3>
              <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
              </button>
            </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-4 min-h-0">
          <form id="booking-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Event Name <span className="text-red-400">*</span>
              </label>
              <input
                ref={eventNameRef}
                type="text"
                onChange={() => setModalBookingError(null)}
                placeholder="Enter event name (e.g., Annual Conference, Team Meeting)"
                maxLength={100}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                required
              />
              <p className="text-white/40 text-xs mt-1">
                <span id="event-name-length">0</span>/100 characters <span id="event-name-check">(min 3)</span>
              </p>
                </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Event Description</label>
              <textarea
                ref={eventDescriptionRef}
                onChange={() => setModalBookingError(null)}
                placeholder="Enter event description (optional)"
                rows="3"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none"
              />
                    </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Date From</label>
                <input
                  type="date"
                  value={modalBookingData.dateFrom}
                  onChange={(e) => {
                    setModalBookingData(prev => ({ ...prev, dateFrom: e.target.value }));
                    setModalBookingError(null);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  required
                />
                    </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Date To</label>
                <input
                  type="date"
                  value={modalBookingData.dateTo}
                  onChange={(e) => {
                    setModalBookingData(prev => ({ ...prev, dateTo: e.target.value }));
                    setModalBookingError(null);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  required
                />
                    </div>
                    </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Time From</label>
                <input
                  type="time"
                  value={modalBookingData.timeFrom}
                  onChange={(e) => {
                    setModalBookingData(prev => ({ ...prev, timeFrom: e.target.value }));
                    setModalBookingError(null);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Time To</label>
                <input
                  type="time"
                  value={modalBookingData.timeTo}
                  onChange={(e) => {
                    setModalBookingData(prev => ({ ...prev, timeTo: e.target.value }));
                    setModalBookingError(null);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <label className="block text-white/70 text-sm mb-1">
                Email List <span className="text-red-400">*</span> (at least one required)
              </label>
              
              <div>
                <label className="block text-white/70 text-xs mb-2">Upload CSV File</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="flex-1 px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm cursor-pointer hover:bg-black/70 transition-all duration-200 flex items-center justify-center"
                  >
                    {modalCsvFileName ? `📄 ${modalCsvFileName}` : '📁 Choose CSV File'}
                  </label>
                  {modalCsvFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalCsvEmails([]);
                        setModalCsvFileName('');
                        document.getElementById('csv-upload').value = '';
                      }}
                      className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm hover:bg-red-500/30 transition-all"
                      title="Remove CSV file"
                    >
                      ✕
                    </button>
                  )}
                    </div>
                {modalCsvEmails.length > 0 && (
                  <p className="text-white/50 text-xs mt-1">
                    ✓ {modalCsvEmails.length} email{modalCsvEmails.length !== 1 ? 's' : ''} loaded from CSV
                  </p>
                )}
                    </div>

              <div>
                <label className="block text-white/70 text-xs mb-2">Enter Emails Manually</label>
                <textarea
                  ref={textareaRef}
                  onChange={(e) => {
                    setModalBookingError(null);
                    setEmailValidationError(null);
                  }}
                  onBlur={handleEmailBlur}
                  placeholder="Enter emails separated by commas or new lines&#10;Example: email1@example.com, email2@example.com"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none"
                  rows="3"
                />
                {emailValidationError && (
                  <p className="text-red-400 text-xs mt-1">
                    {emailValidationError}
                  </p>
                )}
                {emailCounts.manualCount > 0 && (
                  <p className="text-white/50 text-xs mt-1">
                    ✓ {emailCounts.manualCount} valid email{emailCounts.manualCount !== 1 ? 's' : ''} entered
                  </p>
                )}
              </div>

              {emailCounts.totalCount > 0 && (
                <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-white/80 text-sm font-medium">
                    Total: {emailCounts.totalCount} email{emailCounts.totalCount !== 1 ? 's' : ''} will be notified
                  </p>
              </div>
              )}
            </div>
          </form>
          </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-white/10">
          {modalBookingError && (
            <div className="mb-3">
              <p className="error-text text-sm font-medium whitespace-pre-line">{modalBookingError}</p>
        </div>
      )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white font-medium hover:bg-black/70 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="booking-form"
              disabled={isBooking}
              className="flex-1 gradient-outline-button px-6 py-2.5 rounded-lg text-white font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBooking ? 'Booking...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

  const hasGraph = graphData && graphData.nodes && graphData.nodes.length > 0;
  const hasVenues = venueNodes.length > 0;
  const hasTextInfo = textInformation !== null || hasVenues;
  const showSplitLayout = hasGraph || hasTextInfo || isLoading;
  
  const shouldShowTextPanel = hasTextInfo || hasEverHadTextInfo;

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      {showSplitLayout && (
        <div 
          ref={graphContainerRef}
          className="flex gap-4 py-4"
          style={{ 
            height: 'calc(100vh - 80px - 120px)', 
            paddingTop: '20px',
            paddingLeft: '16px',
            paddingRight: '24px',
            maxHeight: 'calc(100vh - 80px - 120px)',
            overflow: 'visible'
          }}
        >
          <div 
            className={`${shouldShowTextPanel ? 'w-1/2' : 'w-full'} h-full graph-panel rounded-2xl p-6`}
            style={{ minWidth: shouldShowTextPanel ? '50%' : '100%', maxWidth: shouldShowTextPanel ? '50%' : '100%', overflow: 'hidden' }}
          >
                  {isLoading && !hasGraph ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <p className="text-white/80 text-sm">Processing your query...</p>
                </div>
              </div>
            ) : hasGraph ? (
              <GraphVisualizer 
                graphData={graphData} 
                isVisible={true}
                highlightedEdges={highlightedEdges}
                animatingEdges={animatingEdges}
                onNodeClick={(node) => {
                  if (node && (node.group === 'best' || node.group === 'shortlist')) {
                    setSelectedVenue(node);
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/40 text-sm">No graph data available</p>
              </div>
                )}
              </div>

          {shouldShowTextPanel && (
            <div 
              className="w-1/2 h-full graph-panel rounded-2xl"
              style={{ minWidth: '50%', maxWidth: '50%', padding: '24px' }}
            >
              <div className="h-full flex flex-col overflow-hidden">
                <h2 className="text-xl font-bold text-white/90 mb-4 pb-2 border-b border-white/20 flex-shrink-0">
                  Suggested Venue
                </h2>
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 hide-scrollbar">
                  {isLoading && !textInformation && venueNodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
                  ) : selectedVenue ? (
                    renderVenueDetails()
                  ) : venueNodes.length > 0 ? (
                    <div className="flex flex-col gap-3 pr-2">
                      {venueNodes.map((node, index) => (
                        <div key={node.id || index} className="venue-card">
                          <div className="text-white text-base leading-relaxed break-words">
                            {formatVenueLabel(node.label || node.id || '')}
              </div>
            </div>
          ))}
              </div>
                  ) : textInformation ? (
                    <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere pr-2">
                      {textInformation}
                  </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-white/40 text-sm">No information available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!showSplitLayout && !isLoading && (
        <div className="fixed left-0 right-0 flex items-center justify-center px-4" style={{ 
          top: 'calc(50% - 150px)',
          height: 'auto',
          zIndex: 5
        }}>
          <p className="gradient-text text-[2.75rem] font-semibold tracking-tight">Describe the venue you have in mind.</p>
        </div>
      )}

      <div className={`${
        inputPosition === "center" && !showSplitLayout 
          ? 'fixed left-0 right-0 flex items-center justify-center transition-all duration-700 ease-out z-10' 
          : 'fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm transition-all duration-700 ease-out z-20 border-t border-white/5'
      } px-4 py-6`}
      style={inputPosition === "center" && !showSplitLayout ? { 
        top: '50%',
        transform: 'translateY(-50%)',
        height: 'auto',
        maxHeight: 'calc(100vh - 80px)'
      } : {}}
      >
        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={handleSend}>
            <div className="relative flex items-center glass-panel rounded-2xl transition-all duration-300 focus-within:shadow-lg">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 px-4 resize-none border-0 focus:outline-none focus:ring-0 text-sm text-white placeholder-white/60 max-h-32 overflow-y-auto bg-transparent"
                style={{ minHeight: '52px', paddingTop: '16px', paddingBottom: '16px', lineHeight: '1.5' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="mr-2 p-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-xs text-center text-white/70">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>

      {showBookingModal && (
  <BookingModal 
    onClose={() => {
      setShowBookingModal(false);
      setBookingError(null);
      setBookingData({
        eventName: '',
        eventDescription: '',
        dateFrom: '',
        dateTo: '',
        timeFrom: '',
        timeTo: ''
      });
      setManualEmails('');
      setCsvEmails([]);
      setCsvFileName('');
    }}
    onBooking={async (bookingPayload) => {
      setIsBooking(true);
      try {
        await handleBooking(bookingPayload);
      } finally {
        setIsBooking(false);
      }
    }}
    onClearBookingError={() => setBookingError(null)}
    selectedVenue={selectedVenue}
    isBooking={isBooking}
    bookingError={bookingError}
  />
)}
      
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="graph-panel rounded-2xl p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Booking Successful!</h3>
              <p className="text-white/70 text-sm">
                Your venue has been booked successfully and invitation emails have been sent to all recipients.
              </p>
              <button
                onClick={resetToHome}
                className="gradient-outline-button px-8 py-3 rounded-lg text-white font-medium transition-all duration-300 hover:scale-105 mt-4"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
