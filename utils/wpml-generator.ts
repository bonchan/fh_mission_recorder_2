import JSZip from 'jszip';
import { transformWaypointsForExport } from '@/utils/mission-transformer'
import { Mission, Waypoint } from '@/utils/interfaces';
import { formatXML } from '@/utils/utils';

export async function generateDJIMission(mission: Mission) {
  const { template, waylines } = await generateDJIMissionFiles(mission)
  const zip = new JSZip();
  const wpmzFolder = zip.folder("wpmz");
  wpmzFolder?.file("template.kml", template);
  wpmzFolder?.file("waylines.wpml", waylines);
  const content = await zip.generateAsync({ type: "blob" });
  return content;
}

export async function generateDJIMissionFiles(mission: Mission) {

  const activeDrone = mission.device

  const modelParts = (activeDrone?.deviceModelKey || '').split('-');
  const [droneDomain, droneType, droneSubType] = modelParts.map(Number);

  const payloadParts = (activeDrone?.payloadIndex || '').split('-');
  const [payloadType, payloadSubtype, payloadGimbalindex] = payloadParts.map(Number);

  const missionConfig = {
    flyToWaylineMode: 'safely',
    finishAction: 'goHome',
    exitOnRCLost: 'executeLostAction',
    executeRCLostAction: 'goBack',
    takeOffSecurityHeight: 40,
    globalTransitionalSpeed: 10,
    globalRTHHeight: 60,
    takeOffRefPoint: `${activeDrone?.parent?.latitude},${activeDrone?.parent?.longitude},${activeDrone?.parent?.height}`,
    takeOffRefPointAGLHeight: 20, //`${activeDrone?.parent?.height}`,
    droneEnumValue: droneType,
    droneSubEnumValue: droneSubType,
    payloadEnumValue: payloadType,
    payloadSubEnumValue: payloadSubtype,
    payloadPositionIndex: payloadGimbalindex,
  }

  const readyWaypoints = transformWaypointsForExport(mission.waypoints, payloadGimbalindex);

  const missionConfigXml = `
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>${missionConfig.flyToWaylineMode}</wpml:flyToWaylineMode>
      <wpml:finishAction>${missionConfig.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${missionConfig.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${missionConfig.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>${missionConfig.takeOffSecurityHeight}</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>${missionConfig.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:globalRTHHeight>${missionConfig.globalRTHHeight}</wpml:globalRTHHeight>
      ${missionConfig.takeOffRefPoint
      ? `<wpml:takeOffRefPoint>${missionConfig.takeOffRefPoint}</wpml:takeOffRefPoint>`
      : ''
    }
      ${missionConfig.takeOffRefPointAGLHeight
      ? `<wpml:takeOffRefPointAGLHeight>${missionConfig.takeOffRefPointAGLHeight}</wpml:takeOffRefPointAGLHeight>`
      : ''
    }
      <wpml:droneInfo>
        <wpml:droneEnumValue>${missionConfig.droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>${missionConfig.droneSubEnumValue}</wpml:droneSubEnumValue>
      </wpml:droneInfo>
      <wpml:payloadInfo>
        <wpml:payloadEnumValue>${missionConfig.payloadEnumValue}</wpml:payloadEnumValue>
        <wpml:payloadPositionIndex>${missionConfig.payloadPositionIndex}</wpml:payloadPositionIndex>
      </wpml:payloadInfo>
    </wpml:missionConfig>`

  const renderAction = (action: any, index: number) => `
    <wpml:action>
      <wpml:actionId>${action.actionId}</wpml:actionId>
      <wpml:actionActuatorFunc>${action.actionActuatorFunc}</wpml:actionActuatorFunc>
      <wpml:actionActuatorFuncParam>
        ${action.actionActuatorFunc === "orientedShoot"
      ? `
        <wpml:gimbalPitchRotateAngle>${action.actionActuatorFuncParam.gimbalPitchRotateAngle}</wpml:gimbalPitchRotateAngle>
        <wpml:gimbalRollRotateAngle>${action.actionActuatorFuncParam.gimbalRollRotateAngle}</wpml:gimbalRollRotateAngle>
        <wpml:gimbalYawRotateAngle>${action.actionActuatorFuncParam.gimbalYawRotateAngle}</wpml:gimbalYawRotateAngle>
        <wpml:focusX>${action.actionActuatorFuncParam.focusX}</wpml:focusX>
        <wpml:focusY>${action.actionActuatorFuncParam.focusY}</wpml:focusY>
        <wpml:focusRegionWidth>${action.actionActuatorFuncParam.focusRegionWidth}</wpml:focusRegionWidth>
        <wpml:focusRegionHeight>${action.actionActuatorFuncParam.focusRegionHeight}</wpml:focusRegionHeight>
        <wpml:focalLength>${action.actionActuatorFuncParam.focalLength}</wpml:focalLength>
        <wpml:aircraftHeading>${action.actionActuatorFuncParam.aircraftHeading}</wpml:aircraftHeading>
        <wpml:accurateFrameValid>${action.actionActuatorFuncParam.accurateFrameValid}</wpml:accurateFrameValid>
        <wpml:payloadPositionIndex>${action.actionActuatorFuncParam.payloadPositionIndex}</wpml:payloadPositionIndex>
        <wpml:payloadLensIndex>${action.actionActuatorFuncParam.payloadLensIndex}</wpml:payloadLensIndex>
        <wpml:useGlobalPayloadLensIndex>${action.actionActuatorFuncParam.useGlobalPayloadLensIndex}</wpml:useGlobalPayloadLensIndex>
        <wpml:targetAngle>${action.actionActuatorFuncParam.targetAngle}</wpml:targetAngle>
        <wpml:imageWidth>${action.actionActuatorFuncParam.imageWidth}</wpml:imageWidth>
        <wpml:imageHeight>${action.actionActuatorFuncParam.imageHeight}</wpml:imageHeight>
        <wpml:AFPos>${action.actionActuatorFuncParam.afPos}</wpml:AFPos>
        <wpml:gimbalPort>${action.actionActuatorFuncParam.gimbalPort}</wpml:gimbalPort>
        <!--<wpml:orientedCameraType>${action.actionActuatorFuncParam.orientedCameraType}</wpml:orientedCameraType> -->
        <wpml:orientedPhotoMode>${action.actionActuatorFuncParam.orientedPhotoMode}</wpml:orientedPhotoMode>`

      : action.actionActuatorFunc === "gimbalRotate"
        ? `
        <wpml:gimbalRotateMode>${action.actionActuatorFuncParam.gimbalRotateMode}</wpml:gimbalRotateMode>
        <wpml:gimbalPitchRotateEnable>${action.actionActuatorFuncParam.gimbalPitchRotateEnable}</wpml:gimbalPitchRotateEnable>
        <wpml:gimbalPitchRotateAngle>${action.actionActuatorFuncParam.gimbalPitchRotateAngle}</wpml:gimbalPitchRotateAngle>`

        : action.actionActuatorFunc === "rotateYaw"
          ? `
        <wpml:aircraftHeading>${action.actionActuatorFuncParam.aircraftHeading}</wpml:aircraftHeading>
        <wpml:aircraftPathMode>${action.actionActuatorFuncParam.aircraftPathMode}</wpml:aircraftPathMode>`

          : action.actionActuatorFunc === "takePhoto"
            ? `
        <wpml:payloadPositionIndex>${action.actionActuatorFuncParam.payloadPositionIndex}</wpml:payloadPositionIndex>
        <wpml:payloadLensIndex>${action.actionActuatorFuncParam.payloadLensIndex}</wpml:payloadLensIndex>
        <wpml:useGlobalPayloadLensIndex>${action.actionActuatorFuncParam.useGlobalPayloadLensIndex}</wpml:useGlobalPayloadLensIndex>`

            : action.actionActuatorFunc === "zoom"
              ? `
        <wpml:payloadPositionIndex>${action.actionActuatorFuncParam.payloadPositionIndex}</wpml:payloadPositionIndex>
        <wpml:focalLength>${action.actionActuatorFuncParam.focalLength}</wpml:focalLength>`
              : ""
    }
      </wpml:actionActuatorFuncParam>
    </wpml:action>
    `


  const renderPlacemark = (wp: any, index: number) => `
  <Placemark>
    <Point>
      <coordinates>${wp.longitude},${wp.latitude}</coordinates>
    </Point>
    <wpml:index>${index}</wpml:index>
    <wpml:ellipsoidHeight>${wp.ellipsoidHeight}</wpml:ellipsoidHeight>
    <wpml:height>${wp.height}</wpml:height>
    <wpml:waypointSpeed>${wp.waypointSpeed}</wpml:waypointSpeed>
    <wpml:waypointTurnParam>
      <wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode>
      <wpml:waypointTurnDampingDist>0.2</wpml:waypointTurnDampingDist>
    </wpml:waypointTurnParam>
    <wpml:useGlobalHeight>1</wpml:useGlobalHeight>
    <wpml:useGlobalSpeed>1</wpml:useGlobalSpeed>
    <wpml:useGlobalHeadingParam>1</wpml:useGlobalHeadingParam>
    <wpml:useGlobalTurnParam>1</wpml:useGlobalTurnParam>
    <wpml:useStraightLine>${wp.useStraightLine ? 1 : 0}</wpml:useStraightLine>
    
    ${wp.actionGroup ?
      `<wpml:actionGroup>
        <wpml:actionGroupId>${wp.actionGroup.actionGroupId}</wpml:actionGroupId>
        <wpml:actionGroupStartIndex>${wp.actionGroup.actionGroupStartIndex}</wpml:actionGroupStartIndex>
        <wpml:actionGroupEndIndex>${wp.actionGroup.actionGroupEndIndex}</wpml:actionGroupEndIndex>
        <wpml:actionGroupMode>${wp.actionGroup.actionGroupMode}</wpml:actionGroupMode>
        <wpml:actionTrigger>
        <wpml:actionTriggerType>${wp.actionGroup.actionTrigger.actionTriggerType}</wpml:actionTriggerType>
        </wpml:actionTrigger>
        
        ${wp.actionGroup.actions.map((action: any, index: number) => renderAction(action, index)).join('\n')}
      
      </wpml:actionGroup>` : ''
    }
    
    <wpml:isRisky>${wp.isRisky ? 1 : 0}</wpml:isRisky>
  </Placemark>
`;


  const templateFolderXml = `
    <Folder>
      <wpml:templateType>waypoint</wpml:templateType>
      <wpml:templateId>0</wpml:templateId>
      <wpml:waylineCoordinateSysParam>
        <wpml:coordinateMode>WGS84</wpml:coordinateMode>
        <wpml:heightMode>aboveGroundLevel</wpml:heightMode>
      </wpml:waylineCoordinateSysParam>
      <wpml:autoFlightSpeed>15</wpml:autoFlightSpeed>
      <wpml:globalHeight>100</wpml:globalHeight>
      
      ${readyWaypoints.map((wp, index) => renderPlacemark(wp, index)).join('\n')}

      <wpml:payloadParam>
      <wpml:payloadPositionIndex>${payloadGimbalindex}</wpml:payloadPositionIndex>
      <wpml:imageFormat>visable,ir</wpml:imageFormat>
      </wpml:payloadParam>

    </Folder>
`

  const waylinesFolderXml = `
    <Folder>
    <wpml:templateId>0</wpml:templateId>
    <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
    <wpml:waylineId>0</wpml:waylineId>
    <wpml:autoFlightSpeed>15</wpml:autoFlightSpeed>

    ${readyWaypoints.map((wp, index) => renderPlacemark(wp, index)).join('\n')}

    </Folder>
  `
  const headerXml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6">`

  const templateKml = `${headerXml}
<Document>
  <wpml:author>${mission.author}</wpml:author>
  <wpml:createTime>${mission.lastUpdated}</wpml:createTime>
  <wpml:updateTime>${mission.lastUpdated}</wpml:updateTime>
  ${missionConfigXml}
  ${templateFolderXml}
</Document>
</kml>`;

  const waylinesWpml = `${headerXml}
<Document>
  ${missionConfigXml}
  ${waylinesFolderXml}
</Document>
</kml>`;

  return {
    template: formatXML(templateKml),
    waylines: formatXML(waylinesWpml)
  };


}