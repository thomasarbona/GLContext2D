# GLContext2D

GLContext2D is a light package that allows you to manipulate Expo GLView (React Native) like HTML5 Canvas API.

## Example

```javascript

class Example extends Component {

  onContextCreate = gl => {
    this.ctx = new GLContext2D(gl);
    
    this.ctx.clear();
    
    this.drawRectangle();
    this.drawAsset(); 
  }
  
  async drawAsset() {
    const asset = Expo.Asset.fromModule(el.asset);
    await asset.downloadAsync();
    const texture = this.ctx.createTextureFromAsset(asset);
    
    // draw the texture at position 100; 100
    this.ctx.drawImage(texture.texture, texture.width, texture.height, 100, 100);
  }
  
  drawRectangle() {
    // draw a white rectangle of size 100x100 at position 200; 200
    this.ctx.drawRectangle(200, 200, 100, 100);
  }
  
  render() {
    return (
      <View>
        <Expo.GLView
          onContextCreate={this.onContextCreate}
        />
      </View>
    );
  }
}
  
```
